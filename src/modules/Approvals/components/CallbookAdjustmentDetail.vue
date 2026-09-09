<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { approvalsApi } from '../services/approvalsApi';
import type { Approval, CallbookApprovalDetail, CallbookApprovalProduct } from '../types/approval.types';
import { StdAlert, StdButton } from '@/modules/Shared/components/std';

const props = defineProps<{ approval: Approval; canResolve: boolean }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'resolved'): void }>();

const detail = ref<CallbookApprovalDetail | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const quantities = reactive<Record<string, number | string | null>>({});
const confirmed = reactive<Record<string, boolean>>({});

const products = computed(() => detail.value?.products || []);
const allConfirmed = computed(() => products.value.length > 0 && products.value.every(row => confirmed[row.sku]));
const editable = computed(() => props.canResolve && props.approval.status === 'PENDING' && !detail.value?.historical);
const pendingCount = computed(() => products.value.filter(row => !row.is_fresh).length);
const quantityValidity = computed<Record<string, boolean>>(() => Object.fromEntries(
   products.value.map(row => [row.sku, quantityIsValid(row)]),
));
const allQuantitiesValid = computed(() => products.value.every(row => quantityValidity.value[row.sku]));

function basePieces(row: CallbookApprovalProduct): number {
   return Number(detail.value?.historical ? row.cantidad_reportada ?? 0 : row.cantidad_efectiva ?? 0);
}
function quantityValue(row: CallbookApprovalProduct): number {
   const value = quantities[row.sku];
   return value === '' || value === null || value === undefined ? Number.NaN : Number(value);
}
function quantityIsValid(row: CallbookApprovalProduct): boolean {
   const value = quantityValue(row);
   return Number.isInteger(value) && value >= 0;
}
function adjustmentFor(row: CallbookApprovalProduct): number {
   return quantityValue(row) - basePieces(row);
}
function dateLabel(value: string | null | undefined): string {
   if (!value) return 'Sin conteo';
   const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
   return Number.isNaN(date.getTime()) ? 'Sin conteo' : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
}
function statusLabel(row: CallbookApprovalProduct): string {
   return ({ FRESCO: 'Fresco', VENCIDO: 'Vencido', SIN_CONTEO: 'Sin conteo', FECHA_FUTURA: 'Fecha futura' } as const)[row.status];
}
function statusClass(row: CallbookApprovalProduct): string {
   return row.is_fresh
      ? 'border-[hsl(var(--pic-success)/0.28)] bg-[hsl(var(--pic-success)/0.08)] text-pic-success'
      : 'border-[hsl(var(--pic-warning)/0.28)] bg-[hsl(var(--pic-warning)/0.10)] text-pic-warning';
}
function uuid(): string {
   if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, value => {
      const random = Math.floor(Math.random() * 16);
      return (value === 'x' ? random : (random & 3) | 8).toString(16);
   });
}
async function load() {
   loading.value = true;
   error.value = '';
   try {
      detail.value = await approvalsApi.getCallbookDetail(props.approval.id);
      for (const row of products.value) {
         quantities[row.sku] = detail.value.historical
            ? Number(row.cantidad_efectiva ?? 0)
            : basePieces(row);
         confirmed[row.sku] = detail.value.historical;
      }
   } catch (e: any) {
      error.value = e.response?.data?.message || 'No se pudo cargar el catálogo.';
   } finally {
      loading.value = false;
   }
}
async function submit() {
   if (!editable.value || !allConfirmed.value || !allQuantitiesValid.value) return;
   saving.value = true;
   error.value = '';
   try {
      detail.value = await approvalsApi.confirmCallbook(props.approval.id, {
         id_ajuste: uuid(),
         products: products.value.map(row => ({
            sku: row.sku,
            base_audit_id: Number(row.id_auditoria || 0),
            ajuste: adjustmentFor(row),
            confirmed: true,
         })),
      });
      emit('resolved');
   } catch (e: any) {
      error.value = e.response?.data?.message || 'No se pudo confirmar el conteo.';
   } finally {
      saving.value = false;
   }
}

watch(() => props.approval.id, load, { immediate: true });
</script>

<template>
  <section class="space-y-4 font-sans">
    <header class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pic-brand-soft text-pic-brand ring-1 ring-pic-brand-border">
          <i class="fa-solid fa-clipboard-check"></i>
        </span>
        <div class="min-w-0">
          <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-pic-brand">Ajuste Callbook</p>
          <h2 class="truncate text-lg font-extrabold tracking-tight text-pic-text-main">{{ detail?.nombre_tienda || approval.title }}</h2>
          <p class="mt-1 font-mono text-xs text-pic-text-muted">{{ detail?.id_cliente || approval.payload.id_cliente }}</p>
        </div>
      </div>
      <StdButton variant="secondary" size="sm" icon="fa-solid fa-arrow-left" @click="emit('close')">Volver</StdButton>
    </header>

    <StdAlert title="Actualiza también la app de ventas" description="Este ajuste no exime de actualizar el conteo en la app de ventas." tone="warning" />
    <StdAlert v-if="error" title="No se pudo completar la operación" :description="error" tone="danger" />

    <div v-if="loading" class="rounded-xl border border-pic-border bg-pic-surface p-8 text-center text-sm font-semibold text-pic-text-muted">
      <i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Cargando catálogo z8...
    </div>

    <template v-else-if="detail">
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div class="rounded-lg bg-pic-muted-surface px-3 py-2.5"><p class="text-[10px] font-bold uppercase text-pic-text-muted">Fecha de negocio</p><p class="mt-1 font-mono text-sm font-bold text-pic-text-main">{{ dateLabel(detail.business_date) }}</p></div>
        <div class="rounded-lg bg-pic-muted-surface px-3 py-2.5"><p class="text-[10px] font-bold uppercase text-pic-text-muted">Fecha mínima</p><p class="mt-1 font-mono text-sm font-bold text-pic-text-main">{{ dateLabel(detail.oldest_reported_date) }}</p></div>
        <div class="rounded-lg bg-pic-muted-surface px-3 py-2.5"><p class="text-[10px] font-bold uppercase text-pic-text-muted">Productos</p><p class="mt-1 text-sm font-extrabold text-pic-text-main">{{ products.length }}</p></div>
        <div class="rounded-lg bg-pic-muted-surface px-3 py-2.5"><p class="text-[10px] font-bold uppercase text-pic-text-muted">Requieren revisión</p><p class="mt-1 text-sm font-extrabold text-pic-warning">{{ pendingCount }}</p></div>
      </div>

      <div class="space-y-3 lg:hidden">
        <article v-for="row in products" :key="row.sku" class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0"><h3 class="text-sm font-bold text-pic-text-main">{{ row.sku_nombre }}</h3><p class="mt-1 font-mono text-xs text-pic-text-muted">{{ row.sku }}</p></div>
            <span class="shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold" :class="statusClass(row)">{{ statusLabel(row) }}</span>
          </div>
          <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-pic-border pt-3 text-xs">
            <div><dt class="text-pic-text-muted">Existencia base</dt><dd class="mt-0.5 font-mono font-bold text-pic-text-main">{{ basePieces(row) }} pz</dd></div>
            <div><dt class="text-pic-text-muted">Último conteo</dt><dd class="mt-0.5 font-mono font-bold text-pic-text-main">{{ dateLabel(row.ult_fecha_reportada) }}</dd></div>
          </dl>
          <label class="mt-3 block">
            <span class="text-[10px] font-bold uppercase text-pic-text-muted">{{ editable ? 'Cantidad actual' : 'Cantidad confirmada' }}</span>
            <span class="mt-0.5 block text-xs font-medium text-pic-text-muted">Total de piezas contadas físicamente.</span>
            <input v-model.number="quantities[row.sku]" type="number" inputmode="numeric" min="0" step="1" :disabled="!editable" :aria-invalid="!quantityValidity[row.sku]" class="mt-1 h-11 w-full rounded-lg border bg-pic-surface px-3 text-right font-mono text-sm font-bold text-pic-text-main outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border disabled:bg-pic-muted-surface" :class="quantityValidity[row.sku] ? 'border-pic-border' : 'border-[hsl(var(--pic-danger)/0.55)]'">
            <span v-if="!quantityValidity[row.sku]" class="mt-1 block text-xs font-semibold text-pic-danger">Ingresa una cantidad entera igual o mayor que cero.</span>
          </label>
          <label v-if="editable" class="mt-3 flex min-h-11 items-center gap-3 rounded-lg border border-pic-border px-3 text-sm font-semibold text-pic-text-main"><input v-model="confirmed[row.sku]" type="checkbox" class="h-5 w-5 accent-pic-brand">Conteo verificado hoy</label>
        </article>
      </div>

      <div class="hidden overflow-x-auto rounded-xl border border-pic-border bg-pic-surface lg:block">
        <table class="w-full min-w-[760px] table-fixed text-left text-xs">
          <colgroup>
            <col>
            <col class="w-36">
            <col class="w-28">
            <col class="w-36">
            <col class="w-28">
          </colgroup>
          <thead class="bg-pic-muted-surface text-[10px] font-bold uppercase text-pic-text-muted"><tr><th class="px-3 py-3">Producto</th><th class="px-3 py-3">Fecha</th><th class="px-3 py-3 text-right">Reportado</th><th class="px-3 py-3 text-center">Cantidad</th><th class="px-3 py-3 text-center">Verificado</th></tr></thead>
          <tbody class="divide-y divide-pic-border">
            <tr v-for="row in products" :key="row.sku" class="transition hover:bg-pic-brand-soft"><td class="px-3 py-3"><p class="font-bold text-pic-text-main">{{ row.sku_nombre }}</p><p class="font-mono text-pic-text-muted">{{ row.sku }}</p></td><td class="px-3 py-3 font-mono text-pic-text-muted">{{ dateLabel(row.ult_fecha_reportada) }}</td><td class="px-3 py-3 text-right font-mono font-bold">{{ basePieces(row) }}</td><td class="px-3 py-3 text-center"><input v-model.number="quantities[row.sku]" type="number" inputmode="numeric" min="0" step="1" :disabled="!editable" :aria-label="`Cantidad actual de ${row.sku_nombre}`" :aria-invalid="!quantityValidity[row.sku]" class="mx-auto block h-10 w-28 rounded-lg border bg-pic-surface px-2 text-right font-mono font-bold outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border disabled:bg-pic-muted-surface" :class="quantityValidity[row.sku] ? 'border-pic-border' : 'border-[hsl(var(--pic-danger)/0.55)]'"></td><td class="px-3 py-3 text-center"><input v-if="editable" v-model="confirmed[row.sku]" type="checkbox" class="h-5 w-5 accent-pic-brand"><i v-else class="fa-solid fa-check text-pic-success"></i></td></tr>
          </tbody>
        </table>
      </div>

      <footer v-if="editable" class="sticky bottom-0 -mx-3 flex items-center justify-between gap-3 border-t border-pic-border bg-pic-surface/95 px-3 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <p class="text-xs font-semibold text-pic-text-muted">{{ Object.values(confirmed).filter(Boolean).length }} de {{ products.length }} verificados</p>
        <StdButton variant="primary" icon="fa-solid fa-check" :disabled="saving || !allConfirmed || !allQuantitiesValid" @click="submit">{{ saving ? 'Guardando...' : 'Confirmar conteo' }}</StdButton>
      </footer>
    </template>
  </section>
</template>
