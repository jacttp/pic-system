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
const confirmedCount = computed(() => products.value.filter(row => confirmed[row.sku]).length);
const editable = computed(() => props.canResolve && props.approval.status === 'PENDING' && !detail.value?.historical);
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
function confirmAndDismiss(row: CallbookApprovalProduct): void {
   if (!quantityValidity.value[row.sku]) return;
   confirmed[row.sku] = true;
   dismissKeyboard();
}
function dismissKeyboard(): void {
   if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}
function selectQuantity(event: FocusEvent): void {
   if (event.target instanceof HTMLInputElement) event.target.select();
}
function markAsPending(row: CallbookApprovalProduct): void {
   if (editable.value) confirmed[row.sku] = false;
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
   return ({
      FRESCO: 'border-[hsl(var(--pic-success)/0.28)] bg-[hsl(var(--pic-success)/0.08)] text-pic-success',
      VENCIDO: 'border-[hsl(var(--pic-danger)/0.28)] bg-[hsl(var(--pic-danger)/0.08)] text-pic-danger',
      SIN_CONTEO: 'border-[hsl(var(--pic-warning)/0.28)] bg-[hsl(var(--pic-warning)/0.10)] text-pic-warning',
      FECHA_FUTURA: 'border-[hsl(var(--pic-info)/0.28)] bg-[hsl(var(--pic-info)/0.08)] text-pic-info',
   } as const)[row.status];
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
  <section class="@container space-y-4 font-sans">
    <header class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
      <div class="flex min-w-0 items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pic-brand-soft text-pic-brand ring-1 ring-pic-brand-border">
          <i class="fa-solid fa-clipboard-check"></i>
        </span>
        <div class="min-w-0">
          <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-pic-brand">Ajuste Callbook</p>
          <h2 class="mt-0.5 break-words text-base font-extrabold leading-5 tracking-tight text-pic-text-main sm:text-lg sm:leading-6">{{ detail?.nombre_tienda || approval.title }}</h2>
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
      <div class="grid grid-cols-2 gap-2 @3xl:grid-cols-4">
        <div class="rounded-lg border border-pic-border bg-pic-muted-surface px-3 py-2.5"><p class="text-[10px] font-bold uppercase tracking-[0.08em] text-pic-text-muted">Fecha de negocio</p><p class="mt-1 font-mono text-sm font-bold tabular-nums text-pic-text-main">{{ dateLabel(detail.business_date) }}</p></div>
        <div class="rounded-lg border border-pic-border bg-pic-muted-surface px-3 py-2.5"><p class="text-[10px] font-bold uppercase tracking-[0.08em] text-pic-text-muted">Fecha mínima</p><p class="mt-1 font-mono text-sm font-bold tabular-nums text-pic-text-main">{{ dateLabel(detail.oldest_reported_date) }}</p></div>
        <div class="rounded-lg border border-pic-border bg-pic-muted-surface px-3 py-2.5"><p class="text-[10px] font-bold uppercase tracking-[0.08em] text-pic-text-muted">Productos</p><p class="mt-1 text-sm font-extrabold text-pic-text-main">{{ products.length }}</p></div>
        <div class="rounded-lg border border-pic-brand-border bg-pic-brand-soft px-3 py-2.5"><p class="text-[10px] font-bold uppercase tracking-[0.08em] text-pic-brand">Por confirmar</p><p class="mt-1 text-sm font-extrabold text-pic-brand">{{ products.length - confirmedCount }}</p></div>
      </div>

      <div class="space-y-2.5 @4xl:hidden">
        <article v-for="row in products" :key="row.sku" class="min-w-0 overflow-hidden rounded-lg border border-pic-border bg-pic-surface shadow-sm transition hover:border-pic-brand-border @3xl:grid @3xl:grid-cols-[minmax(0,1fr)_13rem_minmax(18rem,0.8fr)]">
          <div class="border-b border-pic-border px-3 py-3 @3xl:flex @3xl:items-center @3xl:border-b-0 @3xl:border-r @3xl:py-2.5">
            <div class="flex w-full items-start justify-between gap-3">
              <div class="min-w-0"><h3 class="break-words text-sm font-bold leading-5 text-pic-text-main">{{ row.sku_nombre }}</h3><p class="mt-1 font-mono text-[11px] text-pic-text-muted">{{ row.sku }}</p></div>
              <span class="shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold" :class="statusClass(row)">{{ statusLabel(row) }}</span>
            </div>
          </div>

          <dl class="grid grid-cols-2 divide-x divide-pic-border border-b border-pic-border bg-pic-muted-surface text-center text-xs @3xl:border-b-0 @3xl:border-r">
            <div class="flex flex-col justify-center px-2 py-2.5">
              <dt class="text-[10px] font-bold uppercase tracking-[0.08em] text-pic-text-muted">Existencia base</dt>
              <dd class="mt-1 font-mono text-sm font-bold tabular-nums text-pic-text-main">{{ basePieces(row) }} pz</dd>
            </div>
            <div class="flex flex-col justify-center px-2 py-2.5">
              <dt class="text-[10px] font-bold uppercase tracking-[0.08em] text-pic-text-muted">Último conteo</dt>
              <dd class="mt-1 font-mono text-xs font-bold tabular-nums text-pic-text-main">{{ dateLabel(row.ult_fecha_reportada) }}</dd>
            </div>
          </dl>

          <div class="bg-pic-brand-soft px-3 py-3 @3xl:py-2.5">
            <div class="flex items-center justify-between gap-3">
              <p :id="`quantity-label-${row.sku}`" class="text-[10px] font-bold uppercase tracking-[0.08em] text-pic-text-muted">{{ editable ? 'Cantidad contada' : 'Cantidad confirmada' }}</p>
              <p v-if="editable && !confirmed[row.sku]" class="text-[10px] font-bold text-pic-brand">Pendiente</p>
              <p v-else-if="editable" class="text-[10px] font-bold text-pic-success">Confirmada</p>
            </div>
            <p :id="`quantity-help-${row.sku}`" class="sr-only">Total de piezas físicas contadas.</p>
            <div class="mt-1.5 grid grid-cols-[minmax(6.5rem,0.72fr)_minmax(9.5rem,1.28fr)] gap-2">
              <div class="relative min-w-0">
                <input
                  v-model.number="quantities[row.sku]"
                  type="number"
                  inputmode="numeric"
                  enterkeyhint="done"
                  autocomplete="off"
                  min="0"
                  step="1"
                  :disabled="!editable"
                  :aria-labelledby="`quantity-label-${row.sku}`"
                  :aria-describedby="`quantity-help-${row.sku}`"
                  :aria-invalid="!quantityValidity[row.sku]"
                  class="h-14 w-full rounded-lg border bg-pic-surface py-2 pl-2.5 pr-8 text-right font-mono text-xl font-bold tabular-nums text-pic-text-main outline-none transition hover:bg-pic-muted-surface focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border disabled:bg-pic-muted-surface"
                  :class="quantityValidity[row.sku] ? 'border-pic-border' : 'border-[hsl(var(--pic-danger)/0.55)]'"
                  @focus="selectQuantity"
                  @input="markAsPending(row)"
                  @keydown.enter.prevent="confirmAndDismiss(row)"
                >
                <span class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold uppercase text-pic-text-muted">pz</span>
              </div>
              <StdButton
                v-if="editable"
                class="!h-14 w-full !rounded-lg !px-4 text-sm"
                variant="primary"
                :disabled="confirmed[row.sku] || !quantityValidity[row.sku]"
                :aria-pressed="confirmed[row.sku]"
                :aria-label="`Verificar cantidad de ${row.sku_nombre}`"
                @click="confirmAndDismiss(row)"
              >
                Confirmar
              </StdButton>
            </div>
            <span v-if="!quantityValidity[row.sku]" class="mt-1.5 block text-xs font-semibold text-pic-danger">Ingresa un entero igual o mayor que cero.</span>
          </div>
        </article>
      </div>

      <div class="hidden min-w-0 overflow-hidden rounded-xl border border-pic-border bg-pic-surface @4xl:block">
        <table class="w-full table-fixed text-left text-xs">
          <colgroup>
            <col>
            <col class="w-28 xl:w-32">
            <col class="w-20 xl:w-24">
            <col class="w-28 xl:w-32">
            <col class="w-28 xl:w-32">
          </colgroup>
          <thead class="bg-pic-muted-surface text-[10px] font-bold uppercase text-pic-text-muted"><tr><th class="px-3 py-3">Producto</th><th class="px-2 py-3">Fecha</th><th class="px-2 py-3 text-right">Reportado</th><th class="px-2 py-3 text-center">Cantidad</th><th class="px-2 py-3 text-center">Confirmación</th></tr></thead>
          <tbody class="divide-y divide-pic-border">
            <tr v-for="row in products" :key="row.sku" class="transition hover:bg-pic-brand-soft"><td class="px-3 py-3"><p class="break-words font-bold text-pic-text-main">{{ row.sku_nombre }}</p><p class="font-mono text-pic-text-muted">{{ row.sku }}</p></td><td class="px-2 py-3 font-mono text-pic-text-muted">{{ dateLabel(row.ult_fecha_reportada) }}</td><td class="px-2 py-3 text-right font-mono font-bold">{{ basePieces(row) }}</td><td class="px-2 py-3 text-center"><input v-model.number="quantities[row.sku]" type="number" inputmode="numeric" min="0" step="1" :disabled="!editable" :aria-label="`Cantidad actual de ${row.sku_nombre}`" :aria-invalid="!quantityValidity[row.sku]" class="mx-auto block h-10 w-24 max-w-full rounded-lg border bg-pic-surface px-2 text-right font-mono font-bold outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border disabled:bg-pic-muted-surface xl:w-28" :class="quantityValidity[row.sku] ? 'border-pic-border' : 'border-[hsl(var(--pic-danger)/0.55)]'" @input="markAsPending(row)"></td><td class="px-2 py-3 text-center"><StdButton v-if="editable" variant="primary" size="sm" :disabled="confirmed[row.sku] || !quantityValidity[row.sku]" :aria-pressed="confirmed[row.sku]" :aria-label="`Verificar cantidad de ${row.sku_nombre}`" @click="confirmAndDismiss(row)">Verificar</StdButton><i v-else class="fa-solid fa-check text-pic-success"></i></td></tr>
          </tbody>
        </table>
      </div>

      <footer v-if="editable" class="sticky bottom-0 -mx-3 flex items-center justify-between gap-3 border-t border-pic-border bg-pic-surface/95 px-3 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <p class="min-w-0 text-xs font-semibold text-pic-text-muted"><span class="sm:hidden">{{ confirmedCount }}/{{ products.length }} listos</span><span class="hidden sm:inline">{{ confirmedCount }} de {{ products.length }} confirmados</span></p>
        <StdButton class="h-11" variant="primary" icon="fa-solid fa-check" :disabled="saving || !allConfirmed || !allQuantitiesValid" @click="submit">{{ saving ? 'Guardando...' : 'Confirmar conteo' }}</StdButton>
      </footer>
    </template>
  </section>
</template>
