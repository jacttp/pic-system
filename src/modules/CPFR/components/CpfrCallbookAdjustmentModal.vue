<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CpfrCallbookAdjustmentLine, CpfrCallbookStoreStatus, CpfrStoreDash } from '../types/cpfrTypes'

const props = defineProps<{
  open: boolean
  storeRow: CpfrStoreDash | null
  status: CpfrCallbookStoreStatus | null
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [products: CpfrCallbookAdjustmentLine[], adjustmentId: string]
}>()

type Line = CpfrCallbookAdjustmentLine & { base: number | null; result: number | null; label: string }
const lines = ref<Line[]>([])
const adjustmentId = ref('')

function createId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

watch(() => [props.open, props.status] as const, () => {
  if (!props.open || !props.status) return
  adjustmentId.value = createId()
  lines.value = props.status.products.map(product => ({
    sku: product.sku,
    base_audit_id: Number(product.id_auditoria || 0),
    ajuste: 0,
    confirmed: false,
    base: product.cantidad_efectiva,
    result: product.cantidad_efectiva,
    label: props.storeRow?.skus.find(sku => sku.sku_muliix === product.sku)?.sku_nombre || product.sku,
  }))
}, { immediate: true })

function updateResult(line: Line) {
  const base = Number(line.base)
  const adjustment = Number(line.ajuste)
  line.result = Number.isFinite(base) && Number.isFinite(adjustment) ? base + adjustment : null
}

const canSave = computed(() => lines.value.length > 0 && lines.value.every(line =>
  line.base_audit_id >= 0 && line.confirmed && Number.isInteger(Number(line.ajuste)) && Number(line.result) >= 0
))

function save() {
  if (!canSave.value) return
  emit('save', lines.value.map(({ sku, base_audit_id, ajuste, confirmed }) => ({ sku, base_audit_id, ajuste: Number(ajuste), confirmed })), adjustmentId.value)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]" @click.self="emit('close')">
      <section class="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-amber-200 bg-white shadow-2xl">
        <header class="border-b border-amber-100 bg-amber-50 px-5 py-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[10px] font-black uppercase tracking-widest text-amber-700">Sams · Conteo vencido</p>
              <h2 class="mt-1 text-base font-black text-slate-800">Actualizar conteo operativo</h2>
              <p class="mt-1 text-xs text-slate-600">{{ storeRow?.nombre_tienda }}</p>
            </div>
            <button class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-600" :disabled="saving" @click="emit('close')">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </header>

        <div class="min-h-0 flex-1 overflow-auto p-5">
          <p class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-900">
            Este ajuste no exime de actualizar el conteo en la app de ventas.
          </p>
          <div class="overflow-x-auto rounded-lg border border-slate-200">
            <table class="w-full min-w-[760px] text-left text-[11px]">
              <thead class="bg-slate-100 text-[9px] font-black uppercase tracking-wider text-slate-500">
                <tr><th class="px-3 py-2.5">Producto</th><th class="px-3 py-2.5 text-right">Reportado</th><th class="px-3 py-2.5">Último conteo</th><th class="px-3 py-2.5 text-right">Ajuste</th><th class="px-3 py-2.5 text-right">Resultado</th><th class="px-3 py-2.5 text-center">Verificado hoy</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="line in lines" :key="line.sku">
                  <td class="px-3 py-3"><p class="font-bold text-slate-800">{{ line.label }}</p><p class="font-mono text-[9px] text-slate-400">{{ line.sku }}</p></td>
                  <td class="px-3 py-3 text-right font-mono font-bold text-slate-700">{{ line.base ?? 'Sin conteo' }}</td>
                  <td class="px-3 py-3 text-slate-600">{{ status?.products.find(product => product.sku === line.sku)?.ult_fecha_reportada || '—' }}</td>
                  <td class="px-3 py-3 text-right"><input v-model.number="line.ajuste" type="number" step="1" class="w-24 rounded-md border border-slate-300 px-2 py-1 text-right font-mono outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" @input="updateResult(line)"></td>
                  <td class="px-3 py-3 text-right font-mono font-black" :class="Number(line.result) < 0 ? 'text-rose-600' : 'text-emerald-700'">{{ line.result ?? '—' }}</td>
                  <td class="px-3 py-3 text-center"><input v-model="line.confirmed" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <footer class="flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <p class="text-[10px] text-slate-500">El pedido sugerido se recalculará con este inventario; el sellout histórico permanece oficial.</p>
          <button class="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-4 text-[10px] font-black uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="!canSave || saving" @click="save">
            <i v-if="saving" class="fa-solid fa-circle-notch fa-spin"></i><i v-else class="fa-solid fa-arrows-rotate"></i> Guardar y recalcular
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
