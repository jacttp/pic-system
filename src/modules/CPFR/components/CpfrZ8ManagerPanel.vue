<script setup lang="ts">
// src/modules/CPFR/components/CpfrZ8ManagerPanel.vue
// Panel de gestión de borradores Z8.
// Permite eliminar cascarones Z8 en estado 'borrador' por rango de fechas,
// cadena y opcionalmente por tienda (id_cliente).
// Limpia: CPFR_ocz8 (fuente) + CPFR_PedidoGenerado (cálculo persistido).

import { ref, computed } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'
import { cpfrApi } from '../services/cpfrApi'
import { toast } from '@/components/ui/toast/use-toast'

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'deleted'): void
}>()

const store = useCpfrStore()

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function toISODate(date: Date): string {
    return date.toISOString().split('T')[0]
}

/** Calcula el lunes de la semana actual (ISO) */
function getMondayOfCurrentWeek(): Date {
    const today = new Date()
    const day = today.getDay() === 0 ? 7 : today.getDay() // lunes=1, domingo=7
    const monday = new Date(today)
    monday.setDate(today.getDate() - (day - 1))
    return monday
}

/** Calcula el domingo de la semana actual (ISO) */
function getSundayOfCurrentWeek(): Date {
    const monday = getMondayOfCurrentWeek()
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return sunday
}

// ── Estado local ──────────────────────────────────────────────────────────────

const fecInicio  = ref<string>(toISODate(getMondayOfCurrentWeek()))
const fecFin     = ref<string>(toISODate(getSundayOfCurrentWeek()))
const nomCadena  = ref<string>(store.nom_cadena || 'soriana')
const idCliente  = ref<string>('')
const deleting   = ref(false)
const lastResult = ref<{
    deleted: number
    detail: { ocz8: number; pedido_generado: number }
} | null>(null)

// ── Computed: descripción del preview ────────────────────────────────────────

const previewDesc = computed(() => {
    const desde = fecInicio.value
        ? new Date(fecInicio.value + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—'
    const hasta = fecFin.value
        ? new Date(fecFin.value + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—'
    return { desde, hasta }
})

const isRangeValid = computed(() => {
    if (!fecInicio.value || !fecFin.value) return false
    return new Date(fecInicio.value) <= new Date(fecFin.value)
})

// ── Acción principal ──────────────────────────────────────────────────────────

async function handleDelete() {
    if (!isRangeValid.value) {
        toast({ title: '⚠️ Rango de fechas inválido', variant: 'destructive', duration: 3000 })
        return
    }

    const tiendaInfo = idCliente.value.trim()
        ? `Tienda: ${idCliente.value.trim()}`
        : 'Todas las tiendas'

    const confirmMsg = [
        `¿Eliminar TODOS los cascarones Z8 en estado BORRADOR?`,
        ``,
        `  Rango:   ${previewDesc.value.desde} → ${previewDesc.value.hasta}`,
        `  Cadena:  ${nomCadena.value}`,
        `  ${tiendaInfo}`,
        ``,
        `Esta acción NO se puede deshacer.`,
    ].join('\n')

    if (!confirm(confirmMsg)) return

    deleting.value = true
    lastResult.value = null

    try {
        const res = await cpfrApi.deleteZ8Drafts({
            fec_inicio: fecInicio.value,
            fec_fin:    fecFin.value,
            nom_cadena: nomCadena.value,
            id_cliente: idCliente.value.trim() || undefined,
        })

        lastResult.value = { deleted: res.deleted, detail: res.detail }

        toast({
            title: `✅ ${res.deleted} registros Z8 eliminados`,
            description: `CPFR_ocz8: ${res.detail.ocz8} · PedidoGenerado: ${res.detail.pedido_generado}`,
            duration: 6000,
        })

        emit('deleted')

    } catch (err: any) {
        toast({
            title: '❌ Error al eliminar borradores Z8',
            description: err?.response?.data?.message ?? 'Error inesperado. Revisa la consola.',
            variant: 'destructive',
            duration: 5000,
        })
    } finally {
        deleting.value = false
    }
}

function resetForm() {
    fecInicio.value  = toISODate(getMondayOfCurrentWeek())
    fecFin.value     = toISODate(getSundayOfCurrentWeek())
    nomCadena.value  = store.nom_cadena || 'soriana'
    idCliente.value  = ''
    lastResult.value = null
}
</script>

<template>
  <!-- Overlay -->
  <div
    class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
    @click="$emit('close')"
  />

  <!-- Drawer lateral -->
  <aside class="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl flex flex-col bg-white shadow-2xl border-l border-slate-200">

    <!-- ── Header ──────────────────────────────────────────────────────────── -->
    <header class="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-rose-100 bg-rose-50/60">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center border border-rose-200 shadow-sm">
          <i class="fa-solid fa-trash-can-arrow-up text-rose-500 text-sm"></i>
        </div>
        <div>
          <p class="text-[13px] font-bold text-slate-800 leading-tight">Gestión de Borradores Z8</p>
          <p class="text-[10px] text-slate-500">
            Elimina cascarones Z8 en estado <span class="font-bold text-amber-600">borrador</span>
          </p>
        </div>
      </div>
      <button
        @click="$emit('close')"
        class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </header>

    <!-- ── Body ────────────────────────────────────────────────────────────── -->
    <div class="flex-1 overflow-y-auto px-5 py-5 space-y-5 scrollbar-thin scrollbar-thumb-slate-200">

      <!-- Advertencia -->
      <div class="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
        <i class="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5 shrink-0"></i>
        <p class="text-[11px] text-amber-700 leading-relaxed">
        Esta acción borra los registros de <strong>CPFR_ocz8</strong> (<code>estado=pendiente</code>)
          y <strong>CPFR_PedidoGenerado</strong> (<code>estado=pendiente/borrador</code>)
          para el rango seleccionado. Solo afecta OC con prefijo <strong>Z8</strong>.
          Úsalo para limpiar antes de regenerar.
        </p>
      </div>

      <!-- ── Filtros ─────────────────────────────────────────────────────── -->
      <div class="space-y-4">

        <!-- Rango de fechas -->
        <div>
          <label class="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">
            <i class="fa-regular fa-calendar mr-1"></i>Rango de Fechas
          </label>
          <div class="flex items-center gap-2">
            <div class="flex flex-col gap-1 flex-1">
              <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-1">Desde</span>
              <input
                type="date"
                v-model="fecInicio"
                class="w-full h-[34px] px-3 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all"
              />
            </div>
            <i class="fa-solid fa-arrow-right text-slate-300 mt-5 shrink-0 text-xs"></i>
            <div class="flex flex-col gap-1 flex-1">
              <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-1">Hasta</span>
              <input
                type="date"
                v-model="fecFin"
                :min="fecInicio"
                class="w-full h-[34px] px-3 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all"
              />
            </div>
          </div>
          <p v-if="!isRangeValid && fecInicio && fecFin" class="text-[10px] text-rose-500 mt-1 pl-1">
            La fecha de inicio debe ser anterior o igual a la fecha final.
          </p>
        </div>

        <!-- Cadena -->
        <div>
          <label class="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">
            <i class="fa-solid fa-link mr-1"></i>Cadena
          </label>
          <input
            type="text"
            v-model="nomCadena"
            placeholder="soriana"
            class="w-full h-[34px] px-3 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all placeholder:text-slate-300"
          />
        </div>

        <!-- Tienda (opcional) -->
        <div>
          <label class="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">
            <i class="fa-solid fa-store mr-1"></i>Tienda
            <span class="ml-1 normal-case font-medium text-slate-300">(opcional — deja vacío para todas)</span>
          </label>
          <input
            type="text"
            v-model="idCliente"
            placeholder="ID Cliente — ej. SORI1234"
            class="w-full h-[34px] px-3 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all placeholder:text-slate-300"
          />
        </div>
      </div>

      <!-- ── Preview de la operación ─────────────────────────────────────── -->
      <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 space-y-2">
        <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">
          <i class="fa-solid fa-magnifying-glass mr-1"></i>Vista Previa
        </p>
        <div class="space-y-1.5 text-[11px]">
          <div class="flex items-start gap-2">
            <span class="text-slate-400 w-16 shrink-0">Rango</span>
            <span class="font-bold text-slate-700">
              {{ previewDesc.desde }} <i class="fa-solid fa-arrow-right text-slate-300 text-[9px] mx-1"></i> {{ previewDesc.hasta }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-400 w-16 shrink-0">Cadena</span>
            <span class="font-bold text-slate-700 uppercase">{{ nomCadena || '—' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-400 w-16 shrink-0">Tienda</span>
            <span class="font-bold" :class="idCliente.trim() ? 'text-slate-700' : 'text-slate-400 italic'">
              {{ idCliente.trim() || 'Todas las tiendas' }}
            </span>
          </div>
          <div class="pt-1 flex items-center gap-2 border-t border-slate-200">
            <span class="text-slate-400 w-16 shrink-0">Tablas</span>
            <div class="flex items-center gap-1.5">
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200">CPFR_ocz8</span>
              <span class="text-slate-300 text-[9px]">+</span>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200">CPFR_PedidoGenerado</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Resultado de la última operación ───────────────────────────── -->
      <transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
      >
        <div
          v-if="lastResult"
          class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5"
        >
          <div class="flex items-center gap-2 mb-2">
            <i class="fa-solid fa-circle-check text-emerald-500"></i>
            <p class="text-[12px] font-bold text-emerald-700">
              {{ lastResult.deleted }} registros eliminados
            </p>
          </div>
          <div class="flex items-center gap-3 text-[10px] text-emerald-600">
            <span>
              <span class="font-bold">CPFR_ocz8:</span> {{ lastResult.detail.ocz8 }}
            </span>
            <span class="text-emerald-300">·</span>
            <span>
              <span class="font-bold">PedidoGenerado:</span> {{ lastResult.detail.pedido_generado }}
            </span>
          </div>
        </div>
      </transition>

    </div>

    <!-- ── Footer ──────────────────────────────────────────────────────────── -->
    <footer class="shrink-0 px-5 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
      <button
        @click="resetForm"
        class="px-3 py-2 text-[10px] font-bold rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <i class="fa-solid fa-rotate-left mr-1"></i> Reiniciar
      </button>

      <div class="flex items-center gap-2">
        <button
          @click="$emit('close')"
          class="px-4 py-2 text-[11px] font-bold rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
        >
          Cerrar
        </button>

        <button
          @click="handleDelete"
          :disabled="deleting || !isRangeValid"
          class="inline-flex items-center gap-2 px-4 py-2 text-[11px] font-bold rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          :class="deleting
            ? 'bg-rose-400 text-white cursor-wait'
            : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'"
        >
          <i
            class="fa-solid text-[10px]"
            :class="deleting ? 'fa-circle-notch fa-spin' : 'fa-trash-can-arrow-up'"
          ></i>
          {{ deleting ? 'Eliminando…' : 'Eliminar Borradores Z8' }}
        </button>
      </div>
    </footer>

  </aside>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar { width: 5px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
</style>
