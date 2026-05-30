<!-- src/modules/Approvals/components/ApprovalDetailModal.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Approval } from '../types/approval.types';
import { APPROVAL_TYPE_CONFIG } from '../types/approval.types';
import { useApprovalsStore } from '../stores/approvalsStore';
import { approvalsApi } from '../services/approvalsApi';
import ApprovalStatusBadge from './ApprovalStatusBadge.vue';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';

const props = defineProps<{
   modelValue: boolean
   approval: Approval | null
   canResolve: boolean
}>();

const emit = defineEmits(['update:modelValue', 'resolved']);

const approvalsStore = useApprovalsStore();

const rejectionReason = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');
const isLoadingCpfrDetail = ref(false);
const cpfrDetailError = ref('');
const cpfrDetail = ref<any | null>(null);

// Reset al abrir
watch(() => props.modelValue, (open) => {
   if (open) {
      rejectionReason.value = '';
      errorMessage.value = '';
      cpfrDetailError.value = '';
   }
});

watch(
   () => [props.modelValue, props.approval?.id, props.approval?.type] as const,
   async ([open, id, type]) => {
      cpfrDetail.value = null;
      cpfrDetailError.value = '';

      if (!open || !id || type !== 'CPFR_ORDER') return;

      isLoadingCpfrDetail.value = true;
      try {
         cpfrDetail.value = await approvalsApi.getCpfrOrderDetail(id);
      } catch (e: any) {
         cpfrDetailError.value = e.response?.data?.message || 'No se pudo cargar el detalle de SKUs.';
      } finally {
         isLoadingCpfrDetail.value = false;
      }
   },
   { immediate: true }
);

const typeConfig = computed(() => {
   if (!props.approval) return { label: '', color: '', icon: '' };
   return APPROVAL_TYPE_CONFIG[props.approval.type] || { label: props.approval.type, color: 'text-slate-500', icon: 'fa-solid fa-file' };
});

const payloadEntries = computed(() => {
   if (!props.approval?.payload) return [];
   return Object.entries(props.approval.payload).filter(([_, v]) => v !== null && v !== undefined);
});

const cpfrPayload = computed<Record<string, any>>(() => props.approval?.payload || {});
const cpfrSource = computed<Record<string, any>>(() => cpfrDetail.value || cpfrPayload.value);

const cpfrNumPedido = computed(() => {
   const p = cpfrSource.value;
   return String(p.num_pedido ?? p.num_pedido_ref ?? 'SIN FOLIO');
});

const cpfrYear = computed(() => String(cpfrSource.value.year ?? cpfrSource.value.anio ?? cpfrPayload.value.year ?? cpfrPayload.value.anio ?? ''));
const cpfrWeek = computed(() => String(cpfrSource.value.semana_ic ?? cpfrSource.value.week ?? cpfrPayload.value.semana_ic ?? cpfrPayload.value.week ?? '').padStart(2, '0'));
const cpfrStoreName = computed(() => String(cpfrSource.value.nombre_tienda ?? cpfrSource.value.id_cliente ?? 'Sin tienda'));
const cpfrStoreId = computed(() => String(cpfrSource.value.id_cliente ?? ''));
const cpfrChain = computed(() => String(cpfrSource.value.nom_cadena ?? 'CPFR').toUpperCase());
const cpfrTotalSkus = computed(() => Number(cpfrSource.value.total_skus ?? cpfrPreviewRows.value.length ?? 0));
const cpfrTotalCadena = computed(() => Number(cpfrSource.value.total_pzas_cadena ?? 0));
const cpfrTotalSugeridas = computed(() => Number(cpfrSource.value.total_pzas_sugeridas ?? 0));

const splitClientId = (idCliente: string) => {
   const idx = idCliente.toLowerCase().indexOf('s');
   if (idx === -1) return { cliente: idCliente || '—', sucursal: '—' };
   return {
      cliente: idCliente.slice(0, idx) || '—',
      sucursal: idCliente.slice(idx + 1) || '—',
   };
};

const formatShortDate = (dateStr?: unknown) => {
   if (!dateStr) return '—';
   const date = new Date(String(dateStr));
   if (Number.isNaN(date.getTime())) return String(dateStr).slice(0, 10);
   return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTemplateDate = (value?: unknown) => {
   if (!value) return '';
   const raw = String(value);
   if (/^\d{8}$/.test(raw)) return raw;
   return raw.slice(0, 10).replace(/-/g, '');
};

const cpfrPreviewRows = computed(() => {
   const p = cpfrSource.value;
   const rawRows = Array.isArray(p.rows) ? p.rows : Array.isArray(p.sku_rows) ? p.sku_rows : [];
   const idParts = splitClientId(cpfrStoreId.value);

   if (rawRows.length) {
      return rawRows.map((row: any) => ({
         cliente: String(row.cliente ?? idParts.cliente),
         nombre: String(row.nombre ?? cpfrStoreName.value),
         sucursal: String(row.sucursal ?? idParts.sucursal),
         fec_fin_embarque: formatTemplateDate(row.fec_fin_embarque ?? p.fec_fin_embarque),
         num_pedido: String(row.num_pedido ?? cpfrNumPedido.value),
         cant_pedida: Number(row.cant_pedida ?? row.cantidad_final_uni ?? row.total_pzas_sugeridas ?? 0),
         cantidad_oc: Number(row.cantidad_oc ?? row.cant_pedida_oc ?? 0),
         sku_muliix: String(row.sku_muliix ?? ''),
         sku_cadena: String(row.sku_cadena ?? ''),
         upc: String(row.upc ?? row.upc_cadena ?? ''),
         desc: String(row.desc ?? row.sku_nombre ?? 'Pedido CPFR'),
         estado: String(row.estado ?? ''),
         escenario: String(row.escenario ?? ''),
         fill_rate: row.fill_rate == null ? null : Number(row.fill_rate),
      }));
   }

   return [{
      cliente: idParts.cliente,
      nombre: cpfrStoreName.value,
      sucursal: idParts.sucursal,
      fec_fin_embarque: formatTemplateDate(p.fec_fin_embarque),
      num_pedido: cpfrNumPedido.value,
      cant_pedida: Number(p.total_pzas_sugeridas ?? 0),
      cantidad_oc: Number(p.total_pzas_cadena ?? 0),
      sku_muliix: '',
      sku_cadena: '',
      upc: '',
      desc: `${p.total_skus ?? 0} SKUs incluidos en la solicitud`,
      estado: '',
      escenario: '',
      fill_rate: null,
   }];
});

const formatDate = (dateStr?: string) => {
   if (!dateStr) return '—';
   return new Date(dateStr).toLocaleString('es-MX', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
   });
};

const closeModal = () => {
   emit('update:modelValue', false);
};

const handleResolve = async (status: 'APPROVED' | 'REJECTED') => {
   if (!props.approval) return;

   if (status === 'REJECTED' && !rejectionReason.value.trim()) {
      errorMessage.value = 'Debes proporcionar un motivo de rechazo.';
      return;
   }

   isSubmitting.value = true;
   errorMessage.value = '';

   try {
      await approvalsStore.resolveApproval(props.approval.id, {
         status,
         rejectionReason: status === 'REJECTED' ? rejectionReason.value : undefined,
      });
      emit('resolved');
      closeModal();
   } catch (e: any) {
      errorMessage.value = e.response?.data?.message || 'Error al resolver solicitud.';
   } finally {
      isSubmitting.value = false;
   }
};
</script>

<template>
   <ModalDialog
      :model-value="modelValue"
      title="Detalle de Solicitud"
      size="4xl"
      @close="closeModal"
   >
      <div v-if="approval" class="space-y-5">

         <!-- Header visual -->
         <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-3">
               <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50" :class="typeConfig.color">
                  <i :class="typeConfig.icon" class="text-sm"></i>
               </div>
               <div class="min-w-0">
                  <p class="text-xs font-medium" :class="typeConfig.color">{{ typeConfig.label }}</p>
                  <h3 class="truncate text-base font-bold text-slate-800">{{ approval.type === 'CPFR_ORDER' ? `OV ${cpfrNumPedido}` : approval.title }}</h3>
               </div>
            </div>
            <ApprovalStatusBadge :status="approval.status" />
         </div>

         <!-- Descripción -->
         <div v-if="approval.type !== 'CPFR_ORDER'" class="bg-slate-50 rounded-lg p-4">
            <p class="text-sm text-slate-700 leading-relaxed">{{ approval.description }}</p>
         </div>

         <!-- Meta info -->
         <div v-if="approval.type !== 'CPFR_ORDER'" class="grid grid-cols-2 gap-4 text-sm">
            <div>
               <p class="text-xs text-slate-400 mb-1">Solicitante</p>
               <p class="font-medium text-slate-700 flex items-center gap-2">
                  <span class="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-[10px] font-bold">
                     {{ approval.requestedBy.substring(0, 2).toUpperCase() }}
                  </span>
                  {{ approval.requestedBy }}
               </p>
            </div>
            <div>
               <p class="text-xs text-slate-400 mb-1">Fecha de solicitud</p>
               <p class="font-medium text-slate-700">{{ formatDate(approval.requestedAt) }}</p>
            </div>
            <div v-if="approval.resolvedBy">
               <p class="text-xs text-slate-400 mb-1">Resuelto por</p>
               <p class="font-medium text-slate-700">{{ approval.resolvedBy }}</p>
            </div>
            <div v-if="approval.resolvedAt">
               <p class="text-xs text-slate-400 mb-1">Fecha de resolución</p>
               <p class="font-medium text-slate-700">{{ formatDate(approval.resolvedAt) }}</p>
            </div>
         </div>

         <!-- Motivo de rechazo (si aplica) -->
         <div v-if="approval.rejectionReason" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-xs font-medium text-red-600 mb-1"><i class="fa-solid fa-circle-xmark mr-1"></i> Motivo de rechazo</p>
            <p class="text-sm text-red-700">{{ approval.rejectionReason }}</p>
         </div>

         <!-- Payload CPFR_ORDER: pedido + template OV -->
         <div v-if="approval.type === 'CPFR_ORDER' && approval.payload" class="space-y-4">
            <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
               <div class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
                  <h4 class="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                     <i class="fa-solid fa-receipt text-brand-500"></i>
                     Vista Previa | Template OV
                  </h4>
                  <span class="text-[9px] font-bold text-slate-400">{{ cpfrPreviewRows.length }} filas</span>
               </div>

               <div class="bg-brand-600 px-4 py-2 text-white">
                  <div class="flex items-center justify-between gap-4">
                     <div class="min-w-0">
                        <p class="truncate text-[11px] font-black uppercase leading-tight">{{ cpfrStoreName }}</p>
                        <p class="mt-0.5 truncate font-mono text-[8px] text-brand-200">{{ cpfrStoreId }} · {{ cpfrChain }}</p>
                     </div>
                     <div class="shrink-0 text-right">
                        <p class="text-[8px] font-bold uppercase tracking-widest text-brand-200">OV</p>
                        <p class="font-mono text-[10px] font-black tracking-widest">{{ cpfrNumPedido }}</p>
                     </div>
                  </div>
               </div>

               <div class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-dashed border-brand-100 bg-brand-50/50 px-4 py-1.5 text-[9px] text-slate-500">
                  <span><b class="font-black text-slate-600">Solicitante</b> {{ approval.requestedBy }}</span>
                  <span><b class="font-black text-slate-600">Fecha</b> {{ formatShortDate(cpfrSource.fec_pedido_cadena) }}</span>
                  <span><b class="font-black text-slate-600">Fin embarque</b> {{ formatShortDate(cpfrSource.fec_fin_embarque) }}</span>
                  <span><b class="font-black text-slate-600">Sem</b> {{ cpfrWeek }} / {{ cpfrYear || '—' }}</span>
                  <span class="ml-auto font-black text-brand-700">{{ cpfrTotalSugeridas.toLocaleString('es-MX') }} pz</span>
               </div>

               <div class="max-h-[390px] overflow-y-auto scrollbar-thin">
                  <div v-if="isLoadingCpfrDetail" class="flex items-center gap-2 px-4 py-3 text-xs font-semibold text-slate-500">
                     <i class="fa-solid fa-circle-notch fa-spin text-brand-500"></i>
                     Cargando detalle de SKUs...
                  </div>
                  <div v-else-if="cpfrDetailError" class="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                     <i class="fa-solid fa-triangle-exclamation mr-1"></i>
                     {{ cpfrDetailError }} Se muestra la información disponible en la solicitud.
                  </div>

                  <div class="grid grid-cols-[minmax(0,1fr)_120px_96px] border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                     <span>Producto</span>
                     <span>SKU</span>
                     <span class="text-right">Piezas</span>
                  </div>

                  <div class="divide-y divide-slate-50">
                     <div
                        v-for="(row, idx) in cpfrPreviewRows"
                        :key="idx"
                        class="grid grid-cols-[minmax(0,1fr)_120px_96px] items-center gap-3 px-4 py-2 text-[11px]"
                        :class="idx % 2 === 1 ? 'bg-slate-50/30' : ''"
                     >
                        <span class="truncate font-bold uppercase text-slate-700" :title="row.desc">{{ row.desc }}</span>
                        <span class="truncate font-mono text-[10px] font-bold text-slate-500" :title="row.sku_muliix || row.sku_cadena || row.upc">
                           {{ row.sku_muliix || row.sku_cadena || row.upc || '—' }}
                        </span>
                        <span class="text-right font-black text-brand-700">{{ Number(row.cant_pedida || 0).toLocaleString('es-MX') }} pz</span>
                     </div>
                  </div>
               </div>
            </section>

            <section v-if="false" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
               <div class="bg-slate-900 px-5 py-4 text-white">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                     <div class="min-w-0">
                        <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">{{ cpfrChain }} · Orden de compra</p>
                        <h3 class="mt-1 truncate font-mono text-2xl font-black tracking-tight">{{ cpfrNumPedido }}</h3>
                        <p class="mt-1 truncate text-xs font-semibold text-slate-300">{{ cpfrStoreId }} · {{ cpfrStoreName }}</p>
                     </div>
                     <div class="grid grid-cols-3 gap-2 text-right">
                        <div class="rounded-xl border border-white/10 bg-white/10 px-3 py-2">
                           <p class="text-[8px] font-black uppercase tracking-widest text-slate-300">SKUs</p>
                           <p class="text-lg font-black">{{ cpfrTotalSkus }}</p>
                        </div>
                        <div class="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
                           <p class="text-[8px] font-black uppercase tracking-widest text-emerald-200">Sugeridas</p>
                           <p class="text-lg font-black text-emerald-100">{{ cpfrTotalSugeridas.toLocaleString('es-MX') }}</p>
                        </div>
                        <div class="rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2">
                           <p class="text-[8px] font-black uppercase tracking-widest text-sky-200">Cadena</p>
                           <p class="text-lg font-black text-sky-100">{{ cpfrTotalCadena.toLocaleString('es-MX') }}</p>
                        </div>
                     </div>
                  </div>
               </div>

               <div class="grid gap-0 border-b border-slate-200 bg-slate-50 md:grid-cols-4">
                  <div class="border-b border-slate-200 p-4 md:border-b-0 md:border-r">
                     <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Solicitante</p>
                     <p class="mt-1 truncate text-sm font-bold text-slate-800">{{ approval.requestedBy }}</p>
                     <p class="text-[11px] text-slate-500">{{ formatDate(approval.requestedAt) }}</p>
                  </div>
                  <div class="border-b border-slate-200 p-4 md:border-b-0 md:border-r">
                     <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Tienda</p>
                     <p class="mt-1 truncate text-sm font-bold text-slate-800">{{ cpfrStoreName }}</p>
                     <p class="truncate text-[11px] text-slate-500">{{ cpfrSource.jefatura ?? 'Sin jefatura' }}</p>
                  </div>
                  <div class="border-b border-slate-200 p-4 md:border-b-0 md:border-r">
                     <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Fechas</p>
                     <p class="mt-1 text-sm font-bold text-slate-800">Pedido: {{ formatShortDate(cpfrSource.fec_pedido_cadena) }}</p>
                     <p class="text-[11px] text-slate-500">Fin embarque: {{ formatShortDate(cpfrSource.fec_fin_embarque) }}</p>
                  </div>
                  <div class="p-4">
                     <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Semana</p>
                     <p class="mt-1 text-sm font-bold text-slate-800">Sem. {{ cpfrWeek }} / {{ cpfrYear || '—' }}</p>
                     <p class="text-[11px] text-slate-500">{{ cpfrChain }}</p>
                  </div>
               </div>

               <div class="bg-slate-100/60">
                  <div class="flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3">
                     <h4 class="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                        <i class="fa-solid fa-receipt text-brand-500"></i>
                        Vista Previa | Template OV
                     </h4>
                     <span class="text-[9px] font-bold text-slate-400">
                        <span class="text-brand-700">{{ cpfrPreviewRows.length }}</span> filas
                     </span>
                  </div>

                  <div class="max-h-[320px] overflow-y-auto p-4 scrollbar-thin">
                     <div v-if="isLoadingCpfrDetail" class="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
                        <i class="fa-solid fa-circle-notch fa-spin text-brand-500"></i>
                        Cargando detalle de SKUs desde CPFR_PedidoGenerado...
                     </div>
                     <div v-else-if="cpfrDetailError" class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                        <i class="fa-solid fa-triangle-exclamation mr-1"></i>
                        {{ cpfrDetailError }} Se muestra la información disponible en la solicitud.
                     </div>

                     <div class="overflow-hidden rounded-xl border border-sky-100 bg-white shadow-sm">
                        <div class="flex items-center justify-between bg-brand-600 px-4 py-2">
                           <div class="min-w-0">
                              <p class="truncate text-[11px] font-black uppercase leading-tight text-white">{{ cpfrStoreName }}</p>
                              <p class="mt-0.5 truncate font-mono text-[8px] text-brand-200">{{ cpfrStoreId }} · {{ cpfrStoreName }}</p>
                           </div>
                           <div class="shrink-0 text-right">
                              <p class="text-[8px] font-bold uppercase tracking-widest text-brand-200">OC</p>
                              <p class="font-mono text-[10px] font-black tracking-widest text-white">{{ cpfrNumPedido }}</p>
                           </div>
                        </div>

                        <div class="flex items-center gap-3 border-b border-dashed border-brand-100 bg-brand-50/50 px-4 py-1.5 font-mono text-[9px] text-slate-500">
                           <span><b class="font-sans font-black text-slate-600">S</b> {{ cpfrPreviewRows[0]?.sucursal || '—' }}</span>
                           <span class="truncate pr-2"><b class="font-sans font-black text-slate-600">C</b> {{ cpfrStoreId }} — {{ cpfrStoreName }}</span>
                           <div class="ml-auto flex items-center gap-1">
                              <span v-if="cpfrWeek" class="rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-sans text-[7px] font-bold uppercase text-indigo-700">
                                 SEM {{ cpfrWeek }}
                              </span>
                           </div>
                        </div>

                        <div class="divide-y divide-slate-50">
                           <div
                              v-for="(row, idx) in cpfrPreviewRows"
                              :key="idx"
                              class="flex flex-col gap-0.5 px-4 py-1.5 text-[9px]"
                              :class="idx % 2 === 1 ? 'bg-slate-50/30' : ''"
                           >
                              <div class="flex items-center justify-between">
                                 <span class="flex-1 truncate pr-2 font-bold uppercase text-slate-700">{{ row.desc }}</span>
                                 <span class="shrink-0 font-black text-brand-700">{{ Number(row.cant_pedida || 0).toLocaleString('es-MX') }} pz</span>
                              </div>
                              <div class="mt-0.5 flex flex-wrap items-center gap-1.5">
                                 <span v-if="row.sku_muliix" class="rounded border border-indigo-200 bg-indigo-50 px-1 py-0.5 font-mono text-[8px] font-bold text-indigo-700">
                                    SKU: {{ row.sku_muliix }}
                                 </span>
                                 <span class="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 font-mono text-[8px] font-bold text-slate-500">
                                    OC: {{ row.num_pedido }}
                                 </span>
                                 <span v-if="row.cantidad_oc" class="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-[8px] font-bold text-slate-500">
                                    CAD: {{ Number(row.cantidad_oc || 0).toLocaleString('es-MX') }} pz
                                 </span>
                                 <span v-if="row.upc" class="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-[8px] font-bold text-slate-500">
                                    UPC: {{ row.upc }}
                                 </span>
                                 <span v-if="row.fill_rate !== null" class="rounded border border-emerald-200 bg-emerald-50 px-1 py-0.5 font-mono text-[8px] font-bold text-emerald-700">
                                    FR: {{ (Number(row.fill_rate || 0) * 100).toFixed(1) }}%
                                 </span>
                                 <span v-if="row.escenario" class="rounded border border-sky-200 bg-sky-50 px-1 py-0.5 font-mono text-[8px] font-bold text-sky-700">
                                    ESC: {{ row.escenario }}
                                 </span>
                                 <span v-if="row.estado" class="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[8px] font-bold uppercase text-slate-600">
                                    {{ row.estado }}
                                 </span>
                                 <span v-if="row.fec_fin_embarque" class="rounded border border-amber-200 bg-amber-50 px-1 py-0.5 font-mono text-[8px] font-bold text-amber-700">
                                    FFE: {{ row.fec_fin_embarque }}
                                 </span>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </section>
         </div>

         <!-- Payload genérico (otros tipos) -->
         <div v-else-if="payloadEntries.length > 0" class="bg-slate-50 rounded-lg p-4">
            <p class="text-xs font-medium text-slate-500 mb-2"><i class="fa-solid fa-database mr-1"></i> Datos adjuntos</p>
            <div class="space-y-1.5">
               <div v-for="[key, value] in payloadEntries" :key="key" class="flex items-start gap-2 text-sm">
                  <span class="text-slate-400 font-mono text-xs min-w-[100px]">{{ key }}:</span>
                  <span class="text-slate-700 break-all">{{ typeof value === 'object' ? JSON.stringify(value) : String(value) }}</span>
               </div>
            </div>
         </div>

         <!-- Error -->
         <div v-if="errorMessage" class="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <i class="fa-solid fa-circle-exclamation"></i> {{ errorMessage }}
         </div>

         <!-- Acciones de resolución -->
         <div v-if="canResolve && approval.status === 'PENDING'" class="border-t border-slate-100 pt-4 space-y-3">
            <p class="text-sm font-semibold text-slate-700">Resolver solicitud</p>

            <div>
               <label class="block text-xs font-medium text-slate-600 mb-1">Motivo de rechazo <span class="text-slate-400">(requerido si rechazas)</span></label>
               <textarea 
                  v-model="rejectionReason"
                  rows="2"
                  class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none text-sm"
                  placeholder="Explica el motivo del rechazo..."
               ></textarea>
            </div>

            <div class="flex gap-3">
               <button
                  @click="handleResolve('APPROVED')"
                  :disabled="isSubmitting"
                  class="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
               >
                  <i :class="isSubmitting ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'" class="text-xs"></i>
                  Aprobar
               </button>
               <button
                  @click="handleResolve('REJECTED')"
                  :disabled="isSubmitting"
                  class="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
               >
                  <i :class="isSubmitting ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-xmark'" class="text-xs"></i>
                  Rechazar
               </button>
            </div>
         </div>

      </div>
   </ModalDialog>
</template>
