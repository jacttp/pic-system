<script setup lang="ts">
// src/modules/CPFR/components/CpfrZ8Panel.vue
// Panel lateral/drawer que muestra los artículos Z8 ausentes.
// Se activa desde CpfrOrderTable cuando el usuario pulsa "Ver Z8".
// Reutiliza los mismos badges y helpers visuales del dashboard principal.

import { computed, watch } from 'vue'
import { useCpfrZ8Store } from '../stores/cpfrZ8Store'
import { useCpfrStore } from '../stores/cpfrStore'
import { toast } from '@/components/ui/toast/use-toast'
import type { CpfrOcZ8, CpfrSkuZ8 } from '../types/cpfrZ8Types'

const emit = defineEmits<{
    (e: 'close'): void
}>()

const z8Store   = useCpfrZ8Store()
const cpfrStore = useCpfrStore()

// ── Carga automática al montar ────────────────────────────────────────────────

if (!z8Store.loaded) {
    z8Store.loadZ8()
}

// ── Helpers visuales (mismo patrón que CpfrOrderTable) ───────────────────────

function n(v: number | null | undefined, dec = 1): string {
    if (v == null) return '—'
    return v.toLocaleString('es-MX', { maximumFractionDigits: dec })
}

function estadoBadge(estado: string | null): { label: string; cls: string } {
    const map: Record<string, { label: string; cls: string }> = {
        pendiente: { label: 'Pendiente', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
        borrador:  { label: 'Borrador',  cls: 'bg-amber-100 text-amber-700 border-amber-200' },
        revision:  { label: 'Revisión',  cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
        aprobado:  { label: 'Aprobado',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        enviado:   { label: 'Enviado',   cls: 'bg-blue-100 text-blue-700 border-blue-200' },
        cerrado:   { label: 'Cerrado',   cls: 'bg-slate-100 text-slate-400 border-slate-200' },
    }
    return map[estado ?? ''] ?? { label: estado ?? '—', cls: 'bg-slate-100 text-slate-500 border-slate-200' }
}

function escenarioCls(esc: 'A' | 'B' | null) {
    if (esc === 'A') return 'bg-sky-100 text-sky-700 border-sky-200'
    if (esc === 'B') return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-slate-100 text-slate-500 border-slate-200'
}

function coberturaColor(cob: number | null, objetivo: number): string {
    if (cob === null) return 'text-slate-400'
    if (cob < objetivo) return 'text-rose-600 font-bold'
    if (cob > objetivo + 0.5) return 'text-amber-600'
    return 'text-emerald-600'
}

// ── Cambio de estado — reutiliza el mismo updateStatus del cpfrStore ──────────

async function changeOCStatus(num_pedido: string, estado: string) {
    if (!cpfrStore.currentWeek) return

    const result = await cpfrStore.updateStatus({
        num_pedido,
        year:   cpfrStore.currentWeek.anio,
        week:   cpfrStore.currentWeek.semana,
        estado: estado as any,
    })

    if (result?.ok) {
        toast({
            title: estado === 'revision'
                ? '✅ Pedido Z8 enviado a revisión'
                : `✅ Estado actualizado → ${estado}`,
            duration: 4000,
        })
        // Refrescar los datos Z8 para reflejar el nuevo estado
        z8Store.reset()
        await z8Store.loadZ8()
    } else {
        toast({
            title: '❌ Error al cambiar estado',
            variant: 'destructive',
            duration: 4000,
        })
    }
}

// ── Computed: total de piezas sugeridas ───────────────────────────────────────

const totalPzSugeridas = computed(() =>
    z8Store.dias
        .flatMap(d => d.tiendas)
        .flatMap(t => t.ocs_z8)
        .flatMap(oc => oc.skus)
        .reduce((acc, s) => acc + (s.pedido_sugerido_pz_red || 0), 0)
)
</script>

<template>
  <!-- Overlay -->
  <div
    class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
    @click="$emit('close')"
  />

  <!-- Drawer lateral -->
  <aside class="fixed right-0 top-0 bottom-0 z-50 w-full max-w-4xl flex flex-col bg-white shadow-2xl border-l border-slate-200">

    <!-- ── Header ──────────────────────────────────────────────────────────── -->
    <header class="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
          <i class="fa-solid fa-clipboard-list text-violet-600 text-sm"></i>
        </div>
        <div>
          <p class="text-[13px] font-bold text-slate-800 leading-tight">Artículos Z8 Ausentes</p>
          <p class="text-[10px] text-slate-500">
            Sem. {{ z8Store.context?.semana_ic ?? '—' }} · {{ z8Store.context?.nom_cadena ?? '' }}
          </p>
        </div>

        <!-- Totales -->
        <div v-if="z8Store.loaded" class="flex items-center gap-2 ml-4">
          <span class="px-2.5 py-1 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 text-[10px] font-bold">
            {{ z8Store.totalSkusZ8 }} SKUs Z8
          </span>
          <span class="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold">
            {{ n(totalPzSugeridas, 0) }} pz sugeridas
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Expandir / Colapsar -->
        <button
          @click="z8Store.expandAllOCs()"
          class="px-3 py-1.5 text-[10px] font-bold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <i class="fa-solid fa-chevron-down mr-1"></i> Expandir todo
        </button>
        <button
          @click="z8Store.collapseAllOCs()"
          class="px-3 py-1.5 text-[10px] font-bold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <i class="fa-solid fa-chevron-up mr-1"></i> Colapsar
        </button>
        <!-- Recargar -->
        <button
          @click="z8Store.reset(); z8Store.loadZ8()"
          :disabled="z8Store.loading"
          class="px-3 py-1.5 text-[10px] font-bold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50"
          title="Recargar Z8"
        >
          <i :class="z8Store.loading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-rotate-right'"></i>
        </button>
        <!-- Cerrar -->
        <button
          @click="$emit('close')"
          class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 text-slate-500 transition-colors"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </header>

    <!-- ── Body ────────────────────────────────────────────────────────────── -->
    <div class="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">

      <!-- Loading -->
      <div v-if="z8Store.loading" class="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
        <i class="fa-solid fa-circle-notch fa-spin text-2xl text-violet-400"></i>
        <p class="text-sm">Calculando artículos Z8...</p>
      </div>

      <!-- Error -->
      <div v-else-if="z8Store.error" class="flex flex-col items-center justify-center h-48 gap-3 text-rose-400">
        <i class="fa-solid fa-circle-exclamation text-2xl"></i>
        <p class="text-sm">{{ z8Store.error }}</p>
        <button
          @click="z8Store.reset(); z8Store.loadZ8()"
          class="text-xs px-4 py-2 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors"
        >
          <i class="fa-solid fa-rotate-right mr-1"></i> Reintentar
        </button>
      </div>

      <!-- Sin datos -->
      <div v-else-if="z8Store.loaded && !z8Store.hasData" class="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
        <i class="fa-solid fa-circle-check text-3xl text-emerald-400"></i>
        <p class="text-sm font-medium text-slate-600">¡Catálogo completo!</p>
        <p class="text-xs text-slate-400">Todos los artículos Z8 ya fueron pedidos esta semana.</p>
      </div>

      <!-- Contenido: días → tiendas → ocs_z8 -->
      <template v-else>
        <div v-for="dia in z8Store.dias" :key="dia.dia_num" class="space-y-3">

          <!-- Header de día -->
          <div class="flex items-center gap-2 py-1">
            <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {{ dia.dia_nombre }}
            </span>
            <div class="flex-1 h-px bg-slate-100"></div>
            <span class="text-[10px] text-slate-400">
              {{ dia.tiendas.length }} tiendas
            </span>
          </div>

          <!-- Tiendas -->
          <div v-for="tienda in dia.tiendas" :key="tienda.id_cliente" class="rounded-xl border border-slate-200 overflow-hidden">

            <!-- Header tienda -->
            <div class="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <div class="flex items-center gap-2.5 min-w-0">
                <i class="fa-solid fa-store text-slate-400 text-xs shrink-0"></i>
                <div class="min-w-0">
                  <p class="text-[12px] font-bold text-slate-800 truncate">{{ tienda.nombre_tienda }}</p>
                  <p class="text-[10px] text-slate-400">
                    {{ tienda.id_cliente }} · {{ tienda.jefatura ?? '—' }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-[10px] text-slate-500">
                  {{ tienda.ocs_z8.reduce((a, o) => a + o.total_skus, 0) }} skus Z8
                </span>
              </div>
            </div>

            <!-- OCs Z8 de la tienda (una por permiso_oc) -->
            <div v-for="oc in tienda.ocs_z8" :key="oc.num_pedido" class="border-b border-slate-100 last:border-b-0">

              <!-- Header OC Z8 -->
              <div
                class="flex items-center justify-between px-4 py-2 bg-violet-50/50 cursor-pointer hover:bg-violet-50 transition-colors"
                @click="z8Store.toggleOC(oc.num_pedido)"
              >
                <div class="flex items-center gap-3">
                  <i
                    :class="z8Store.expandedOCs.has(oc.num_pedido)
                        ? 'fa-solid fa-chevron-down text-violet-500'
                        : 'fa-solid fa-chevron-right text-slate-400'"
                    class="text-xs w-3"
                  ></i>

                  <!-- Permiso OC badge -->
                  <span class="px-2 py-0.5 rounded bg-violet-100 text-violet-700 text-[10px] font-black border border-violet-200">
                    {{ oc.permiso_oc }}
                  </span>

                  <span class="text-[11px] font-mono text-slate-500">{{ oc.num_pedido }}</span>

                  <span
                    class="px-2 py-0.5 rounded-full text-[9px] font-bold border"
                    :class="estadoBadge(oc.estado_pedido).cls"
                  >
                    {{ estadoBadge(oc.estado_pedido).label }}
                  </span>
                </div>

                <!-- Resumen rápido + acciones -->
                <div class="flex items-center gap-3">
                  <div class="text-right hidden sm:block">
                    <p class="text-[10px] text-slate-500">Sugerido</p>
                    <p class="text-[12px] font-bold text-violet-700">
                      {{ n(oc.resumen.pedido_sugerido_pz_red, 0) }} pz
                    </p>
                  </div>
                  <div class="text-right hidden sm:block">
                    <p class="text-[10px] text-slate-500">Cobertura</p>
                    <p
                      class="text-[12px] font-bold"
                      :class="coberturaColor(oc.resumen.cobertura_actual, oc.resumen.semanas_objetivo)"
                    >
                      {{ n(oc.resumen.cobertura_actual) }} sem
                    </p>
                  </div>

                  <!-- Acciones de estado -->
                  <div class="flex items-center gap-1" @click.stop>
                    <button
                      v-if="oc.estado_pedido === 'pendiente'"
                      @click="changeOCStatus(oc.num_pedido, 'borrador')"
                      class="px-2.5 py-1 text-[9px] font-bold rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 transition-colors"
                    >
                      Borrador
                    </button>
                    <button
                      v-if="['pendiente', 'borrador'].includes(oc.estado_pedido)"
                      @click="changeOCStatus(oc.num_pedido, 'revision')"
                      class="px-2.5 py-1 text-[9px] font-bold rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200 transition-colors"
                    >
                      → Revisión
                    </button>
                  </div>
                </div>
              </div>

              <!-- Tabla de SKUs Z8 (expandida) -->
              <div v-if="z8Store.expandedOCs.has(oc.num_pedido)" class="overflow-x-auto">
                <table class="w-full text-[11px]">
                  <thead>
                    <tr class="bg-slate-50 border-b border-slate-200">
                      <th class="text-left px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">SKU</th>
                      <th class="text-right px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Inv. actual</th>
                      <th class="text-right px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Prom. sellout</th>
                      <th class="text-right px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Cobertura</th>
                      <th class="text-right px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Sugerido</th>
                      <th class="text-center px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Escen.</th>
                      <th class="text-left px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Par Z8</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="sku in oc.skus"
                      :key="sku.sku_muliix"
                      class="border-b border-slate-100 hover:bg-violet-50/30 transition-colors"
                    >
                      <!-- SKU nombre -->
                      <td class="px-4 py-2">
                        <p class="font-semibold text-slate-800 truncate max-w-[200px]">{{ sku.sku_nombre }}</p>
                        <p class="text-[9px] text-slate-400 font-mono">{{ sku.sku_muliix }}</p>
                      </td>

                      <!-- Inventario -->
                      <td class="px-3 py-2 text-right text-slate-600">
                        <span>{{ n(sku.inv_actual_pz, 0) }} pz</span>
                        <p class="text-[9px] text-slate-400">{{ n(sku.inv_actual_kg, 1) }} kg</p>
                      </td>

                      <!-- Sellout promedio -->
                      <td class="px-3 py-2 text-right text-slate-600">
                        <span>{{ n(sku.promedio_sellout_pz, 1) }} pz/sem</span>
                      </td>

                      <!-- Cobertura -->
                      <td class="px-3 py-2 text-right">
                        <span
                          class="font-bold"
                          :class="coberturaColor(sku.cobertura_actual, sku.semanas_objetivo)"
                        >
                          {{ n(sku.cobertura_actual) }} sem
                        </span>
                      </td>

                      <!-- Pedido sugerido -->
                      <td class="px-3 py-2 text-right">
                        <span class="font-black text-violet-700">
                          {{ n(sku.pedido_sugerido_pz_red, 0) }} pz
                        </span>
                        <p class="text-[9px] text-slate-400">{{ n(sku.pedido_sugerido_kg, 1) }} kg</p>
                      </td>

                      <!-- Escenario -->
                      <td class="px-3 py-2 text-center">
                        <span
                          class="px-1.5 py-0.5 rounded text-[9px] font-bold border"
                          :class="escenarioCls(sku.escenario)"
                        >
                          {{ sku.escenario ?? '—' }}
                        </span>
                      </td>

                      <!-- Par Z8 (informativo) -->
                      <td class="px-3 py-2">
                        <template v-if="sku.par_muliix">
                          <span class="text-[9px] text-slate-500 font-mono">{{ sku.par_muliix }}</span>
                          <span class="ml-1 text-[9px] text-slate-400">
                            ({{ n(sku.mixbase, 0) }}% / {{ n(sku.mixpar, 0) }}%)
                          </span>
                        </template>
                        <span v-else class="text-slate-300">—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ── Footer ──────────────────────────────────────────────────────────── -->
    <footer class="shrink-0 px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
      <p class="text-[10px] text-slate-400">
        Los artículos Z8 siguen el mismo flujo de aprobación que las OC regulares.
        <span class="text-violet-500 font-semibold">par_muliix / mixpar</span> se aplican post-embarque.
      </p>
      <button
        @click="$emit('close')"
        class="px-4 py-2 rounded-xl bg-slate-800 text-white text-[11px] font-bold hover:bg-slate-700 transition-all"
      >
        Cerrar
      </button>
    </footer>

  </aside>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar { width: 5px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
</style>