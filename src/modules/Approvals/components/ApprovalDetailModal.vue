<!-- src/modules/Approvals/components/ApprovalDetailModal.vue -->
<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import type { Approval } from '../types/approval.types';
import { APPROVAL_TYPE_CONFIG } from '../types/approval.types';
import { useApprovalsStore } from '../stores/approvalsStore';
import { approvalsApi } from '../services/approvalsApi';
import ApprovalStatusBadge from './ApprovalStatusBadge.vue';
import logoUrl from '@/assets/logo.png';

const props = defineProps<{
   modelValue: boolean
   approval: Approval | null
   canResolve: boolean
}>();

interface CpfrPreviewRow {
   id_cliente: string
   cliente: string
   nombre: string
   sucursal: string
   jefatura: string
   semana_ic: string
   anio: string
   fec_pedido_cadena: string
   fec_fin_embarque: string
   num_pedido: string
   cant_pedida: number
   cantidad_base_uni: number
   ajuste: number
   ajuste_mix: number
   pzas_bolsa: number
   ajusteValido: boolean
   cantidad_oc: number
   pedido_kg: number
   inv_actual_pz: number
   inv_actual_kg: number
   promedio_sellout_pz: number
   promedio_sellout_kg: number
   unidad_inventario: number
   cobertura_calculada: number | null
   sku_muliix: string
   sku_cadena: string
   upc: string
   desc: string
   estado: string
   escenario: string
   fill_rate: number | null
   source_type: string
   permiso_oc: string
   par_muliix: string
   mixbase: number | null
   mixpar: number | null
}

interface CpfrMixGroup {
   source_type: string
   id_cliente: string
   num_pedido: string
   anio: string
   semana_ic: string
   fec_pedido_cadena: string
   base_sku: string
   base_name: string
   pair_sku: string
   pair_name: string
   mixbase: number
   mixpar: number
   pre_mix_quantity: number
   base_ajuste_mix: number
   pair_ajuste_mix: number
   base_unit_kg: number
   pair_unit_kg: number
   base_bag: number
   pair_bag: number
   base_final_pieces: number
   pair_final_pieces: number
   base_final_kg: number
   pair_final_kg: number
   total_kg: number
   total_diff_kg: number
   ratio_diff_kg: number
   applied: boolean
}

interface CpfrOrderGroup {
   key: string
   num_pedido: string
   semana_ic: string
   anio: string
   fec_pedido_cadena: string
   fec_fin_embarque: string
   rows: CpfrPreviewRow[]
   totalPz: number
   totalKg: number
}

interface CpfrStoreGroup {
   key: string
   id_cliente: string
   nombre_tienda: string
   cliente: string
   sucursal: string
   jefatura: string
   nom_cadena: string
   orders: CpfrOrderGroup[]
   totalOrders: number
   totalSkus: number
   totalPz: number
   totalKg: number
}

const emit = defineEmits(['update:modelValue', 'resolved']);

const approvalsStore = useApprovalsStore();

const resolutionComment = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');
const isLoadingCpfrDetail = ref(false);
const cpfrDetailError = ref('');
const cpfrDetail = ref<any | null>(null);
const adjustingRows = ref<Set<string>>(new Set());
const isLoadingMixPreview = ref(false);
const isApplyingMix = ref(false);
const cpfrMixError = ref('');
const cpfrMixPreview = ref<{ has_mix: boolean; pending_count: number; groups: CpfrMixGroup[] } | null>(null);
const mixOverrides = reactive<Record<string, { mixbase: number; mixpar: number }>>({});
const mixDefaultRatios = reactive<Record<string, { mixbase: number; mixpar: number }>>({});
const selectedMixRowKey = ref('');
let mixPreviewTimer: ReturnType<typeof setTimeout> | null = null;

// Reset al abrir
watch(() => props.modelValue, (open) => {
   if (open) {
      resolutionComment.value = '';
      errorMessage.value = '';
      cpfrDetailError.value = '';
      cpfrMixError.value = '';
      adjustingRows.value = new Set();
      cpfrMixPreview.value = null;
      selectedMixRowKey.value = '';
      Object.keys(mixOverrides).forEach(key => delete mixOverrides[key]);
      Object.keys(mixDefaultRatios).forEach(key => delete mixDefaultRatios[key]);
   }
});

watch(
   () => [props.modelValue, props.approval?.id, props.approval?.type] as const,
   async ([open, id, type]) => {
      cpfrDetail.value = null;
      cpfrDetailError.value = '';
      cpfrMixPreview.value = null;
      cpfrMixError.value = '';
      selectedMixRowKey.value = '';
      Object.keys(mixOverrides).forEach(key => delete mixOverrides[key]);
      Object.keys(mixDefaultRatios).forEach(key => delete mixDefaultRatios[key]);

      if (!open || !id || type !== 'CPFR_ORDER') return;

      isLoadingCpfrDetail.value = true;
      try {
         cpfrDetail.value = await approvalsApi.getCpfrOrderDetail(id);
         await loadCpfrMixPreview(id);
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
   if (Array.isArray(p.num_pedidos) && p.num_pedidos.length) {
      return p.num_pedidos.map((item: unknown) => String(item)).join(', ');
   }
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
const canEditCpfrOrder = computed(() =>
   props.approval?.type === 'CPFR_ORDER' && props.approval?.status === 'PENDING' && props.canResolve
);

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

const toNumericValue = (value: unknown, fallback = 0) => {
   const numeric = Number(value);
   return Number.isFinite(numeric) ? numeric : fallback;
};

function getMixKey(group: Pick<CpfrMixGroup, 'source_type' | 'num_pedido' | 'base_sku'>) {
   return `${group.source_type}|${group.num_pedido}|${group.base_sku}`;
}

function syncMixOverrides(groups: CpfrMixGroup[]) {
   for (const group of groups) {
      const key = getMixKey(group);
      if (!mixDefaultRatios[key]) {
         mixDefaultRatios[key] = {
            mixbase: Number(group.mixbase || 0),
            mixpar: Number(group.mixpar || 0),
         };
      }
      if (!mixOverrides[key]) {
         mixOverrides[key] = {
            mixbase: Number(group.mixbase || 0),
            mixpar: Number(group.mixpar || 0),
         };
      }
   }
}

async function loadCpfrMixPreview(id: number) {
   isLoadingMixPreview.value = true;
   cpfrMixError.value = '';
   try {
      const preview = await approvalsApi.getCpfrMixPreview(id);
      cpfrMixPreview.value = preview;
      syncMixOverrides(preview.groups || []);
   } catch (e: any) {
      cpfrMixError.value = e.response?.data?.message || 'No se pudo cargar el mix.';
   } finally {
      isLoadingMixPreview.value = false;
   }
}

const mixOverridePayload = computed(() =>
   Object.entries(mixOverrides).map(([key, value]) => {
      const [source_type, num_pedido, base_sku] = key.split('|');
      return {
         source_type,
         num_pedido,
         base_sku,
         mixbase: Number(value.mixbase || 0),
         mixpar: Number(value.mixpar || 0),
      };
   })
);

const cpfrMixGroups = computed<CpfrMixGroup[]>(() => cpfrMixPreview.value?.groups || []);
const hasCpfrMix = computed(() => cpfrMixGroups.value.length > 0);
const pendingCpfrMixCount = computed(() => cpfrMixPreview.value?.pending_count || 0);
const cpfrMixGroupsByRowKey = computed(() => {
   const groups = new Map<string, CpfrMixGroup>();
   for (const group of cpfrMixGroups.value) {
      groups.set(getMixKey(group), group);
   }
   return groups;
});
const selectedMixGroup = computed(() => {
   if (!selectedMixRowKey.value) return null;
   return cpfrMixGroupsByRowKey.value.get(selectedMixRowKey.value) || null;
});

const rowHasMixMetadata = (row: CpfrPreviewRow) => Boolean(row.par_muliix);
const isMixPairRow = (row: CpfrPreviewRow) => String(row.permiso_oc || '').toLowerCase() === 'mix';
const canShowCpfrStepper = computed(() => canEditCpfrOrder.value);
const getMixRowKey = (row: CpfrPreviewRow) => `${row.source_type}|${row.num_pedido}|${row.sku_muliix}`;
const getRowMixGroup = (row: CpfrPreviewRow) => cpfrMixGroupsByRowKey.value.get(getMixRowKey(row)) || null;
const groupPreKg = (group: CpfrMixGroup) => Number(group.pre_mix_quantity || 0) * Number(group.base_unit_kg || 0);
const groupMixPieces = (group: CpfrMixGroup) => Number(group.base_final_pieces || 0) + Number(group.pair_final_pieces || 0);
const groupMixKg = (group: CpfrMixGroup) => Number(group.base_final_kg || 0) + Number(group.pair_final_kg || 0);
const groupMixDiffPieces = (group: CpfrMixGroup) => groupMixPieces(group) - Number(group.pre_mix_quantity || 0);
const getRowMixStatus = (row: CpfrPreviewRow): 'applied' | 'pending' | 'missing' => {
   const group = getRowMixGroup(row);
   if (!group) return 'missing';
   return group.applied ? 'applied' : 'pending';
};
const getRowMixButtonClass = (row: CpfrPreviewRow) => {
   const status = getRowMixStatus(row);
   if (status === 'applied') return 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100';
   if (status === 'pending') return 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100';
   return 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50';
};
const getRowMixButtonTitle = (row: CpfrPreviewRow) => {
   const status = getRowMixStatus(row);
   if (status === 'applied') return 'Mix aplicado';
   if (status === 'pending') return 'Mix actualizado pendiente de guardar';
   return 'Revisar mix de producto';
};
const openRowMix = (row: CpfrPreviewRow) => {
   const key = getMixRowKey(row);
   const defaults = mixDefaultRatios[key];
   if (defaults) {
      mixOverrides[key] = { ...defaults };
      selectedMixRowKey.value = key;
      scheduleCpfrMixPreview(0);
      return;
   }
   selectedMixRowKey.value = key;
};
const closeRowMix = () => {
   if (mixPreviewTimer) {
      clearTimeout(mixPreviewTimer);
      mixPreviewTimer = null;
   }
   selectedMixRowKey.value = '';
};

const normalizeMixRatio = (value: unknown) => {
   const numeric = Number(value);
   if (!Number.isFinite(numeric)) return 0;
   const bounded = Math.min(1, Math.max(0, numeric));
   return Number((Math.round(bounded * 10) / 10).toFixed(1));
};

function setMixRatio(group: CpfrMixGroup, field: 'mixbase' | 'mixpar', value: unknown) {
   const key = getMixKey(group);
   const changed = normalizeMixRatio(value);
   mixOverrides[key] = field === 'mixbase'
      ? { mixbase: changed, mixpar: normalizeMixRatio(1 - changed) }
      : { mixbase: normalizeMixRatio(1 - changed), mixpar: changed };
   scheduleCpfrMixPreview();
}

function handleMixRatioInput(group: CpfrMixGroup, field: 'mixbase' | 'mixpar', event: Event) {
   setMixRatio(group, field, (event.target as HTMLInputElement).value);
}

function scheduleCpfrMixPreview(delay = 250) {
   if (mixPreviewTimer) clearTimeout(mixPreviewTimer);
   mixPreviewTimer = setTimeout(() => {
      mixPreviewTimer = null;
      void recalculateCpfrMix();
   }, delay);
}

async function recalculateCpfrMix() {
   if (!props.approval?.id) return;
   isLoadingMixPreview.value = true;
   cpfrMixError.value = '';
   try {
      const preview = await approvalsApi.recalculateCpfrMixPreview(props.approval.id, mixOverridePayload.value);
      cpfrMixPreview.value = preview;
      syncMixOverrides(preview.groups || []);
   } catch (e: any) {
      cpfrMixError.value = e.response?.data?.message || 'No se pudo recalcular el mix.';
   } finally {
      isLoadingMixPreview.value = false;
   }
}

async function applyCpfrMix() {
   if (!props.approval?.id || isApplyingMix.value) return;
   isApplyingMix.value = true;
   cpfrMixError.value = '';
   try {
      await approvalsApi.applyCpfrMix(props.approval.id, mixOverridePayload.value);
      await refreshCpfrDetail();
      await loadCpfrMixPreview(props.approval.id);
   } catch (e: any) {
      cpfrMixError.value = e.response?.data?.message || 'No se pudo aplicar el mix.';
   } finally {
      isApplyingMix.value = false;
   }
}

const isAdjustmentMultiple = (adjustment: number, bagMultiple: number) => {
   if (adjustment === 0 || bagMultiple <= 0) return true;
   return Math.abs(adjustment % bagMultiple) < 0.0001;
};

const cpfrPreviewRows = computed(() => {
   const p = cpfrSource.value;
   const rawRows = Array.isArray(p.rows) ? p.rows : Array.isArray(p.sku_rows) ? p.sku_rows : [];
   const idParts = splitClientId(cpfrStoreId.value);

   if (rawRows.length) {
      return rawRows.map((row: any): CpfrPreviewRow => {
         const unidad = toNumericValue(row.unidad_inventario);
         const ajuste = toNumericValue(row.ajuste);
         const ajusteMix = toNumericValue(row.ajuste_mix);
         const pzasBolsa = toNumericValue(row.pzas_bolsa ?? row.pzas_caja);
         const cantidadBase = toNumericValue(
            row.cantidad_base_uni ?? row.cantidad_final_uni ?? row.pedido_sugerido_pz_red ?? row.cant_pedida ?? row.total_pzas_sugeridas
         );
         const cantPedida = row.ajuste === undefined || row.ajuste === null
            ? toNumericValue(row.cant_pedida ?? row.cantidad_total_uni ?? row.pedido_sugerido_pz_red ?? cantidadBase)
            : cantidadBase + ajuste + ajusteMix;
         return {
         id_cliente: String(row.id_cliente ?? cpfrStoreId.value),
         cliente: String(row.cliente ?? splitClientId(String(row.id_cliente ?? cpfrStoreId.value)).cliente ?? idParts.cliente),
         nombre: String(row.nombre ?? row.nombre_tienda ?? cpfrStoreName.value),
         sucursal: String(row.sucursal ?? splitClientId(String(row.id_cliente ?? cpfrStoreId.value)).sucursal ?? idParts.sucursal),
         jefatura: String(row.jefatura ?? p.jefatura ?? ''),
         semana_ic: String(row.semana_ic ?? p.semana_ic ?? cpfrWeek.value ?? '').padStart(2, '0'),
         anio: String(row.anio ?? p.anio ?? p.year ?? cpfrYear.value ?? ''),
         fec_pedido_cadena: formatTemplateDate(row.fec_pedido_cadena ?? p.fec_pedido_cadena),
         fec_fin_embarque: formatTemplateDate(row.fec_fin_embarque ?? p.fec_fin_embarque),
         num_pedido: String(row.num_pedido ?? cpfrNumPedido.value),
         cant_pedida: cantPedida,
         cantidad_base_uni: cantidadBase,
         ajuste,
         ajuste_mix: ajusteMix,
         pzas_bolsa: pzasBolsa,
         ajusteValido: isAdjustmentMultiple(ajuste, pzasBolsa),
         cantidad_oc: Number(row.cantidad_oc ?? row.cant_pedida_oc ?? 0),
         pedido_kg: Number(row.pedido_kg ?? (cantPedida * unidad) ?? 0),
         inv_actual_pz: Number(row.inv_actual_pz ?? row.inv_actual_uni ?? 0),
         inv_actual_kg: Number(row.inv_actual_kg ?? 0),
         promedio_sellout_pz: Number(row.promedio_sellout_pz ?? row.venta_prom_uni ?? 0),
         promedio_sellout_kg: Number(row.promedio_sellout_kg ?? row.venta_prom_kg ?? 0),
         unidad_inventario: unidad,
         cobertura_calculada: row.cobertura_calculada == null ? null : Number(row.cobertura_calculada),
         sku_muliix: String(row.sku_muliix ?? ''),
         sku_cadena: String(row.sku_cadena ?? ''),
         upc: String(row.upc ?? row.upc_cadena ?? ''),
         desc: String(row.desc ?? row.sku_nombre ?? 'Pedido CPFR'),
         estado: String(row.estado ?? ''),
         escenario: String(row.escenario ?? ''),
         fill_rate: row.fill_rate == null ? null : Number(row.fill_rate),
         source_type: String(row.source_type ?? 'pedido_generado'),
         permiso_oc: String(row.permiso_oc ?? ''),
         par_muliix: String(row.par_muliix ?? ''),
         mixbase: row.mixbase == null ? null : Number(row.mixbase),
         mixpar: row.mixpar == null ? null : Number(row.mixpar),
         };
      });
   }

   return [{
      cliente: idParts.cliente,
      id_cliente: cpfrStoreId.value,
      nombre: cpfrStoreName.value,
      sucursal: idParts.sucursal,
      jefatura: String(cpfrSource.value.jefatura ?? ''),
      semana_ic: cpfrWeek.value,
      anio: cpfrYear.value,
      fec_pedido_cadena: formatTemplateDate(p.fec_pedido_cadena),
      fec_fin_embarque: formatTemplateDate(p.fec_fin_embarque),
      num_pedido: cpfrNumPedido.value,
      cant_pedida: Number(p.total_pzas_sugeridas ?? 0),
      cantidad_base_uni: Number(p.total_pzas_sugeridas ?? 0),
      ajuste: 0,
      ajuste_mix: 0,
      pzas_bolsa: 0,
      ajusteValido: true,
      cantidad_oc: Number(p.total_pzas_cadena ?? 0),
      pedido_kg: 0,
      inv_actual_pz: 0,
      inv_actual_kg: 0,
      promedio_sellout_pz: 0,
      promedio_sellout_kg: 0,
      unidad_inventario: 0,
      cobertura_calculada: null,
      sku_muliix: '',
      sku_cadena: '',
      upc: '',
      desc: `${p.total_skus ?? 0} SKUs incluidos en la solicitud`,
      estado: '',
      escenario: '',
      fill_rate: null,
      source_type: '',
      permiso_oc: '',
      par_muliix: '',
      mixbase: null,
      mixpar: null,
   } satisfies CpfrPreviewRow];
});

const cpfrStoreGroups = computed<CpfrStoreGroup[]>(() => {
   const storeMap = new Map<string, CpfrStoreGroup>();

   for (const row of cpfrPreviewRows.value) {
      const storeKey = row.id_cliente || (row.cliente && row.sucursal ? `${row.cliente}s${row.sucursal}` : row.nombre);
      const idCliente = row.id_cliente || storeKey;

      if (!storeMap.has(storeKey)) {
         storeMap.set(storeKey, {
            key: storeKey,
            id_cliente: idCliente,
            nombre_tienda: row.nombre || cpfrStoreName.value,
            cliente: row.cliente,
            sucursal: row.sucursal,
            jefatura: row.jefatura || String(cpfrSource.value.jefatura ?? ''),
            nom_cadena: cpfrChain.value,
            orders: [],
            totalOrders: 0,
            totalSkus: 0,
            totalPz: 0,
            totalKg: 0,
         });
      }

      const storeGroup = storeMap.get(storeKey)!;
      let orderGroup = storeGroup.orders.find(order => order.num_pedido === row.num_pedido);
      if (!orderGroup) {
         orderGroup = {
            key: `${storeKey}|${row.num_pedido}`,
            num_pedido: row.num_pedido,
            semana_ic: row.semana_ic || cpfrWeek.value,
            anio: row.anio || cpfrYear.value,
            fec_pedido_cadena: row.fec_pedido_cadena,
            fec_fin_embarque: row.fec_fin_embarque,
            rows: [],
            totalPz: 0,
            totalKg: 0,
         };
         storeGroup.orders.push(orderGroup);
      }

      orderGroup.rows.push(row);
      orderGroup.totalPz += row.cant_pedida;
      orderGroup.totalKg += row.pedido_kg;
      storeGroup.totalSkus += 1;
      storeGroup.totalPz += row.cant_pedida;
      storeGroup.totalKg += row.pedido_kg;
   }

   return Array.from(storeMap.values()).map(group => ({
      ...group,
      totalOrders: group.orders.length,
   }));
});

const formatDate = (dateStr?: string) => {
   if (!dateStr) return '—';
   return new Date(dateStr).toLocaleString('es-MX', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
   });
};

const formatNumber = (value: number | null | undefined, decimals = 0) => {
   if (value === null || value === undefined || Number.isNaN(value)) return '-';
   return value.toLocaleString('es-MX', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
   });
};

const calcularCoberturaDinamica = (row: CpfrPreviewRow): number | null => {
   const totalPz = Number(row.cant_pedida || 0);
   const invKg = Number(row.inv_actual_kg || 0);
   const unidadInventario = Number(row.unidad_inventario || 0);
   const promedioKg = Number(row.promedio_sellout_kg || 0);

   if (promedioKg > 0 && unidadInventario > 0) {
      return ((totalPz * unidadInventario) + invKg) / promedioKg;
   }

   const promedioPz = Number(row.promedio_sellout_pz || 0);
   if (promedioPz > 0) {
      return (totalPz + Number(row.inv_actual_pz || 0)) / promedioPz;
   }

   return null;
};

const coberturaStatus = (row: CpfrPreviewRow): 'ok' | 'bajo' | 'sobre' | 'sin_datos' => {
   const cobertura = calcularCoberturaDinamica(row);
   if (cobertura === null) return 'sin_datos';
   if (cobertura < 2.5) return 'bajo';
   if (cobertura > 3) return 'sobre';
   return 'ok';
};

const coberturaClass = (row: CpfrPreviewRow) => {
   const status = coberturaStatus(row);
   if (status === 'bajo') return 'text-rose-600';
   if (status === 'sobre') return 'text-orange-600';
   if (status === 'sin_datos') return 'text-slate-400';
   return 'text-emerald-600';
};

const coberturaIcon = (row: CpfrPreviewRow) => {
   const status = coberturaStatus(row);
   if (status === 'bajo') return 'fa-solid fa-triangle-exclamation text-rose-500';
   if (status === 'sobre') return 'fa-solid fa-arrow-trend-up text-orange-500';
   if (status === 'sin_datos') return 'fa-solid fa-circle-question text-slate-300';
   return '';
};

const coberturaTooltip = (row: CpfrPreviewRow) => {
   const cobertura = calcularCoberturaDinamica(row);
   const status = coberturaStatus(row);
   if (status === 'bajo') return `Bajo stock: cobertura ${cobertura?.toFixed(2)} sem.`;
   if (status === 'sobre') return `Sobrestock: cobertura ${cobertura?.toFixed(2)} sem.`;
   if (status === 'sin_datos') return 'Sin histórico de venta promedio';
   return 'Cobertura sana: 2.5 a 3.0 sem.';
};

const getCpfrRowKey = (row: CpfrPreviewRow) =>
   `${row.source_type}|${row.id_cliente}|${row.sku_muliix}|${row.num_pedido}|${row.anio}|${row.semana_ic}|${row.fec_pedido_cadena}`;

const isRowAdjusting = (row: CpfrPreviewRow) => adjustingRows.value.has(getCpfrRowKey(row));

const canDecreaseCpfrRow = (row: CpfrPreviewRow) => {
   const step = Number(row.pzas_bolsa || 0);
   return step > 0 && row.cantidad_base_uni + row.ajuste - step >= 0;
};

const canIncreaseCpfrRow = (row: CpfrPreviewRow) => {
   const step = Number(row.pzas_bolsa || 0);
   return step > 0 && row.ajuste < 0 && row.cantidad_base_uni + row.ajuste + step <= row.cantidad_base_uni;
};

const setRowAdjusting = (row: CpfrPreviewRow, isAdjusting: boolean) => {
   const next = new Set(adjustingRows.value);
   const key = getCpfrRowKey(row);
   if (isAdjusting) {
      next.add(key);
   } else {
      next.delete(key);
   }
   adjustingRows.value = next;
};

const refreshCpfrDetail = async () => {
   if (!props.approval?.id) return;
   cpfrDetail.value = await approvalsApi.getCpfrOrderDetail(props.approval.id);
};

const handleAdjustPedido = async (row: CpfrPreviewRow, direction: 1 | -1) => {
   if (!props.approval || !canEditCpfrOrder.value || isRowAdjusting(row)) return;

   const step = Number(row.pzas_bolsa || 0);
   if (step <= 0) {
      errorMessage.value = 'Este SKU no tiene pzas_bolsa configurado para ajustar.';
      return;
   }

   const nextAdjustment = row.ajuste + (step * direction);
   const nextTotal = row.cantidad_base_uni + nextAdjustment;
   if (nextTotal < 0) return;
   if (nextTotal > row.cantidad_base_uni) return;

   setRowAdjusting(row, true);
   errorMessage.value = '';

   try {
      await approvalsApi.updateCpfrOrderAdjustment(props.approval.id, {
         id_cliente: row.id_cliente,
         sku_muliix: row.sku_muliix,
         num_pedido: row.num_pedido,
         anio: row.anio,
         semana_ic: row.semana_ic,
         fec_pedido_cadena: row.fec_pedido_cadena,
         source_type: row.source_type,
         ajuste: nextAdjustment,
      });
      await refreshCpfrDetail();
      if (props.approval?.id) await loadCpfrMixPreview(props.approval.id);
   } catch (e: any) {
      errorMessage.value = e.response?.data?.message || 'No se pudo ajustar el pedido.';
   } finally {
      setRowAdjusting(row, false);
   }
};

const getGeneratedLabel = (storeGroup: CpfrStoreGroup) => {
   const date = new Date(props.approval?.requestedAt || Date.now());
   const formatted = date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
   });
   const week = storeGroup.orders[0]?.semana_ic ? `SEM ${storeGroup.orders[0].semana_ic}` : 'SEM -';
   const sucursal = storeGroup.sucursal ? `Sucursal ${storeGroup.sucursal}` : 'Sucursal -';
   return `Generado ${formatted} | ${week} | ${sucursal}`;
};

const closeModal = () => {
   emit('update:modelValue', false);
};

const handleConfirm = async () => {
   if (!props.approval) return;

   isSubmitting.value = true;
   errorMessage.value = '';

   try {
      if (pendingCpfrMixCount.value > 0) {
         await approvalsApi.applyCpfrMix(props.approval.id, mixOverridePayload.value);
      }
      await approvalsStore.resolveApproval(props.approval.id, {
         status: 'APPROVED',
         rejectionReason: resolutionComment.value.trim() || undefined,
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
   <section v-if="modelValue && approval" class="space-y-4">
      <div class="space-y-4">

         <!-- Header visual -->
         <div v-if="approval.type !== 'CPFR_ORDER'" class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex items-center gap-3">
               <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50" :class="typeConfig.color">
                  <i :class="typeConfig.icon" class="text-sm"></i>
               </div>
               <div class="min-w-0">
                  <p class="text-xs font-medium" :class="typeConfig.color">{{ typeConfig.label }}</p>
                  <h3 class="truncate text-base font-bold text-slate-800">{{ approval.type === 'CPFR_ORDER' ? `OV ${cpfrNumPedido}` : approval.title }}</h3>
               </div>
            </div>
            <div class="flex items-center justify-between gap-3 sm:justify-end">
               <button
                  type="button"
                  class="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50/20 hover:text-brand-700"
                  @click="closeModal"
               >
                  <i class="fa-solid fa-arrow-left text-[10px]"></i>
                  Volver
               </button>
               <ApprovalStatusBadge :status="approval.status" />
            </div>
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

         <!-- Comentarios de resolucion -->
         <div v-if="approval.rejectionReason" class="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p class="text-xs font-medium text-slate-600 mb-1"><i class="fa-regular fa-comment-dots mr-1"></i> Comentarios</p>
            <p class="text-sm text-slate-700">{{ approval.rejectionReason }}</p>
         </div>

         <!-- Payload CPFR_ORDER: pedido + template OV -->
         <div v-if="approval.type === 'CPFR_ORDER' && approval.payload" class="space-y-4">
            <div>
               <button
                  type="button"
                  class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-pic-border bg-pic-surface px-3.5 text-sm font-bold text-pic-text-main shadow-sm transition hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand"
                  @click="closeModal"
               >
                  <i class="fa-solid fa-arrow-left text-xs"></i>
                  Volver a solicitudes
               </button>
            </div>

            <section class="space-y-3">
               <section class="overflow-hidden rounded-xl border border-white/10 bg-pic-nav text-pic-nav-text shadow-sm">
                  <div class="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                     <div class="flex min-w-0 items-start gap-3.5">
                        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pic-brand-soft text-pic-brand ring-1 ring-pic-brand-border">
                           <i :class="typeConfig.icon" class="text-base"></i>
                        </div>
                        <div class="min-w-0 pt-0.5">
                           <p class="text-[11px] font-semibold text-pic-nav-text-muted">{{ typeConfig.label }}</p>
                           <h3 class="mt-0.5 break-words text-sm font-bold leading-5 text-pic-nav-text sm:text-base md:text-lg">OV {{ cpfrNumPedido }}</h3>
                        </div>
                     </div>
                     <ApprovalStatusBadge :status="approval.status" dark />
                  </div>

                  <div class="border-t border-white/10 px-4 py-3 sm:px-5">
                     <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div class="flex items-center gap-2 text-xs text-pic-nav-text-muted">
                           <span class="flex h-6 w-6 items-center justify-center rounded-md bg-pic-brand text-pic-brand-border">
                              <i class="fa-solid fa-receipt text-[11px]"></i>
                           </span>
                           <span class="font-bold">Vista previa</span>
                           <span class="text-white/25">/</span>
                           <span class="font-semibold text-pic-nav-text">Template OV</span>
                        </div>
                        <dl class="grid grid-cols-3 divide-x divide-pic-brand-border rounded-lg border border-pic-brand-border bg-pic-brand-soft text-center">
                           <div class="min-w-[72px] px-3 py-1.5">
                              <dd class="text-sm font-bold text-pic-brand">{{ cpfrStoreGroups.length }}</dd>
                              <dt class="mt-0.5 font-bold text-[10px] text-pic-text-main">Tiendas</dt>
                           </div>
                           <div class="min-w-[72px] px-3 py-1.5">
                              <dd class="text-sm font-bold text-pic-brand">{{ cpfrPreviewRows.length }}</dd>
                              <dt class="mt-0.5 font-bold text-[10px] text-pic-text-main">SKU</dt>
                           </div>
                           <div class="min-w-[72px] px-3 py-1.5">
                              <dd class="text-sm font-bold text-pic-brand">{{ formatNumber(cpfrStoreGroups.reduce((sum, store) => sum + store.totalKg, 0), 1) }}</dd>
                              <dt class="mt-0.5 font-bold text-[10px] text-pic-text-main">Kg</dt>
                           </div>
                        </dl>
                     </div>
                  </div>
               </section>

               <div v-if="isLoadingCpfrDetail" class="flex items-center gap-2 px-4 py-3 text-xs font-semibold text-slate-500">
                  <i class="fa-solid fa-circle-notch fa-spin text-brand-500"></i>
                  Cargando detalle de SKUs...
               </div>
               <div v-else-if="cpfrDetailError" class="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                  <i class="fa-solid fa-triangle-exclamation mr-1"></i>
                  {{ cpfrDetailError }} Se muestra la informacion disponible en la solicitud.
               </div>

               <section
                  v-if="false"
                  class="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 shadow-sm"
               >
                  <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                     <div>
                        <h4 class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-800">
                           <i class="fa-solid fa-scale-balanced text-emerald-600"></i>
                           Mix de producto
                        </h4>
                        <p class="mt-1 text-[11px] font-semibold text-emerald-700">
                           Pedido final = sugerido + ajuste + mix. Pendientes: {{ pendingCpfrMixCount }}
                        </p>
                     </div>
                     <div v-if="canEditCpfrOrder" class="flex flex-wrap items-center gap-2">
                        <button
                           type="button"
                           class="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-[10px] font-black text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                           :disabled="isLoadingMixPreview || isApplyingMix"
                           @click="recalculateCpfrMix"
                        >
                           <i class="fa-solid fa-rotate text-[10px]" :class="{ 'fa-spin': isLoadingMixPreview }"></i>
                           Recalcular
                        </button>
                        <button
                           type="button"
                           class="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-[10px] font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                           :disabled="isLoadingMixPreview || isApplyingMix || !hasCpfrMix"
                           @click="applyCpfrMix"
                        >
                           <i class="fa-solid text-[10px]" :class="isApplyingMix ? 'fa-circle-notch fa-spin' : 'fa-check'"></i>
                           Aplicar mix
                        </button>
                     </div>
                  </div>

                  <div v-if="cpfrMixError" class="mt-3 rounded-md border border-rose-100 bg-white px-3 py-2 text-[11px] font-semibold text-rose-700">
                     {{ cpfrMixError }}
                  </div>
                  <div v-else-if="isLoadingMixPreview" class="mt-3 flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
                     <i class="fa-solid fa-circle-notch fa-spin"></i>
                     Cargando mix...
                  </div>
                  <div v-else-if="!cpfrMixGroups.length" class="mt-3 rounded-md border border-amber-100 bg-white px-3 py-2 text-[11px] font-semibold text-amber-700">
                     Hay metadata de mix en el pedido, pero el preview no encontro un grupo aplicable. Revisa que el SKU par exista en catalogo Z8 con permiso mix y que la OC/Z8 fuente siga sin confirmar.
                  </div>

                  <div v-if="cpfrMixGroups.length" class="mt-3 grid gap-2 xl:grid-cols-2">
                     <article
                        v-for="group in cpfrMixGroups"
                        :key="getMixKey(group)"
                        class="rounded-lg border border-emerald-100 bg-white p-3"
                     >
                        <div class="flex items-start justify-between gap-3">
                           <div class="min-w-0">
                              <p class="truncate text-[11px] font-black text-slate-800" :title="`${group.base_name} / ${group.pair_name}`">
                                 {{ group.base_name }} / {{ group.pair_name }}
                              </p>
                              <p class="mt-1 font-mono text-[9px] font-bold text-slate-400">
                                 {{ group.source_type === 'ocz8' ? 'Z8' : 'OC' }} {{ group.num_pedido }} · {{ group.base_sku }} -> {{ group.pair_sku }}
                              </p>
                           </div>
                           <span
                              class="shrink-0 rounded-md px-2 py-1 text-[9px] font-black"
                              :class="group.applied ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
                           >
                              {{ group.applied ? 'Aplicado' : 'Pendiente' }}
                           </span>
                        </div>
                        <div v-if="mixOverrides[getMixKey(group)]" class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                           <label class="text-[9px] font-black uppercase tracking-wide text-slate-500">
                              Base
                              <input
                                 v-model.number="mixOverrides[getMixKey(group)].mixbase"
                                 type="number"
                                 min="0"
                                 step="0.01"
                                 class="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-right text-[11px] font-bold text-slate-700"
                                 :disabled="!canEditCpfrOrder"
                              >
                           </label>
                           <label class="text-[9px] font-black uppercase tracking-wide text-slate-500">
                              Par
                              <input
                                 v-model.number="mixOverrides[getMixKey(group)].mixpar"
                                 type="number"
                                 min="0"
                                 step="0.01"
                                 class="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-right text-[11px] font-bold text-slate-700"
                                 :disabled="!canEditCpfrOrder"
                              >
                           </label>
                           <div class="rounded-md bg-slate-50 px-2 py-1.5 text-right">
                              <p class="text-[8px] font-black uppercase text-slate-400">Base final</p>
                              <p class="text-[11px] font-black text-slate-700">{{ formatNumber(group.base_final_pieces, 0) }} pz</p>
                           </div>
                           <div class="rounded-md bg-slate-50 px-2 py-1.5 text-right">
                              <p class="text-[8px] font-black uppercase text-slate-400">Par final</p>
                              <p class="text-[11px] font-black text-slate-700">{{ formatNumber(group.pair_final_pieces, 0) }} pz</p>
                           </div>
                        </div>
                        <div class="mt-2 grid grid-cols-3 gap-2 text-right text-[10px] font-bold">
                           <span class="rounded bg-slate-50 px-2 py-1 text-slate-500">Pre {{ formatNumber(group.pre_mix_quantity, 0) }} pz</span>
                           <span class="rounded bg-emerald-50 px-2 py-1 text-emerald-700">Mix {{ formatNumber(group.base_ajuste_mix + group.pair_ajuste_mix, 0) }} pz</span>
                           <span class="rounded bg-amber-50 px-2 py-1 text-amber-700">Dif {{ formatNumber(group.total_diff_kg, 2) }} kg</span>
                        </div>
                     </article>
                  </div>
               </section>

               <div class="space-y-4">
                  <article
                     v-for="storeGroup in cpfrStoreGroups"
                     :key="storeGroup.key"
                     class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                  >
                     <div class="grid gap-3 bg-white px-3 py-3 sm:px-4 lg:grid-cols-[112px_minmax(0,1fr)]">
                        <div class="hidden items-center justify-center lg:flex">
                           <div class="flex h-16 w-24 items-center justify-center rounded-md border border-slate-100 bg-white p-2 shadow-inner">
                              <img
                                 :src="logoUrl"
                                 alt="Logo"
                                 class="max-h-12 max-w-[80px] object-contain"
                              />
                           </div>
                        </div>

                        <div class="rounded-lg bg-brand-600 px-4 py-4 text-white sm:px-5">
                           <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div class="min-w-0">
                                 <p class="truncate text-base font-black uppercase tracking-tight">
                                    {{ storeGroup.nom_cadena }} {{ storeGroup.nombre_tienda }}
                                 </p>
                                 <p class="mt-2 text-[10px] font-semibold text-brand-100">
                                    Cliente {{ storeGroup.id_cliente }} | Jefatura {{ storeGroup.jefatura || 'N/D' }}
                                 </p>
                              </div>
                              <div class="shrink-0 text-left sm:text-right">
                                 <p class="text-[10px] font-black uppercase tracking-widest text-white">{{ storeGroup.totalOrders }} OC</p>
                                 <p class="mt-2 text-[10px] font-black text-white">
                                    {{ storeGroup.totalSkus }} SKU | {{ formatNumber(storeGroup.totalPz, 0) }} pz | {{ formatNumber(storeGroup.totalKg, 1) }} kg
                                 </p>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div class="mx-3 mb-3 flex items-center gap-3 rounded-md bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-600 sm:mx-4 sm:px-4 sm:py-3">
                        <i class="fa-regular fa-calendar-days text-brand-500"></i>
                        <span>{{ getGeneratedLabel(storeGroup) }}</span>
                     </div>

                     <div class="space-y-3 px-3 pb-4 sm:px-4 sm:pb-5">
                        <section v-for="order in storeGroup.orders" :key="order.key" class="overflow-hidden rounded-lg border border-slate-100 bg-white">
                           <div class="relative overflow-hidden rounded-t-lg bg-brand-600 px-3 py-3 text-white sm:px-4">
                              <div class="absolute inset-y-0 right-0 hidden w-[128px] origin-bottom skew-x-[-18deg] bg-amber-500 sm:block"></div>
                              <div class="relative flex items-center justify-between gap-4">
                                 <div class="min-w-0">
                                    <p class="truncate text-[11px] font-black uppercase tracking-wide">OC {{ order.num_pedido }}</p>
                                    <p class="mt-1 text-[9px] font-black leading-relaxed text-brand-100 sm:truncate sm:text-white">
                                       SEM {{ order.semana_ic || '-' }} <span class="hidden sm:inline">| Pedido {{ order.fec_pedido_cadena || '-' }} | Fin emb. {{ order.fec_fin_embarque || '-' }} |</span> {{ order.rows.length }} SKU
                                    </p>
                                 </div>
                                 <p class="shrink-0 rounded-md bg-white/15 px-2 py-1 text-right text-[10px] font-black text-white sm:bg-transparent sm:px-0 sm:py-0">
                                    {{ formatNumber(order.totalPz, 0) }} pz <span class="hidden sm:inline">| {{ formatNumber(order.totalKg, 1) }} kg</span>
                                 </p>
                              </div>
                           </div>

                           <div class="space-y-2 bg-slate-50 p-2.5 xl:hidden">
                              <article
                                 v-for="(row, idx) in order.rows"
                                 :key="`${order.key}|mobile|${row.sku_muliix || row.sku_cadena || row.upc}|${idx}`"
                                 class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:grid md:grid-cols-[minmax(0,1fr)_240px_164px]"
                              >
                                 <div class="border-b border-slate-100 px-3 py-3 md:flex md:items-center md:border-b-0 md:border-r md:py-2.5">
                                    <div class="flex items-start justify-between gap-3">
                                       <div class="min-w-0">
                                          <p class="line-clamp-2 text-[11px] font-black uppercase leading-snug text-slate-800" :title="row.desc">{{ row.desc }}</p>
                                          <p class="mt-1 truncate font-mono text-[9px] font-bold text-slate-400">
                                             SKU {{ row.sku_muliix || row.sku_cadena || row.upc || '-' }}
                                          </p>
                                       </div>
                                       <button
                                          v-if="rowHasMixMetadata(row)"
                                          type="button"
                                          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border text-xs font-black shadow-sm transition"
                                          :class="getRowMixButtonClass(row)"
                                          :title="getRowMixButtonTitle(row)"
                                          @click="openRowMix(row)"
                                       >
                                          <i v-if="getRowMixStatus(row) === 'pending'" class="fa-solid fa-triangle-exclamation"></i>
                                          <span v-else>M</span>
                                       </button>
                                     </div>
                                 </div>

                                 <div class="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/70 text-center md:border-b-0 md:border-r">
                                    <div class="px-1 py-2 md:flex md:flex-col md:justify-center">
                                       <p class="text-[8px] font-black uppercase tracking-wide text-slate-400">Inv. act.</p>
                                       <p class="mt-0.5 text-[11px] font-black text-brand-700">{{ formatNumber(row.inv_actual_pz, 0) }}</p>
                                    </div>
                                    <div class="px-1 py-2 md:flex md:flex-col md:justify-center">
                                       <p class="text-[8px] font-black uppercase tracking-wide text-slate-400">Sell prom.</p>
                                       <p class="mt-0.5 text-[11px] font-black text-brand-700">{{ formatNumber(row.promedio_sellout_pz, 0) }}</p>
                                    </div>
                                    <div class="px-1 py-2 md:flex md:flex-col md:justify-center" :title="coberturaTooltip(row)">
                                       <p class="text-[8px] font-black uppercase tracking-wide text-slate-400">Cobertura</p>
                                       <p class="mt-0.5 text-[11px] font-black" :class="coberturaClass(row)">
                                          <i v-if="coberturaIcon(row)" :class="coberturaIcon(row)" class="mr-0.5 text-[9px]"></i>{{ formatNumber(calcularCoberturaDinamica(row), 2) }}
                                       </p>
                                    </div>
                                 </div>

                                 <div class="flex items-center justify-between gap-3 bg-brand-50/40 px-3 py-3 md:py-2.5">
                                    <div class="min-w-0">
                                       <p class="text-[8px] font-black uppercase tracking-wide text-slate-500">Pedido final</p>
                                       <p class="mt-0.5 text-xl font-black leading-none text-brand-700">
                                          <i v-if="isRowAdjusting(row)" class="fa-solid fa-circle-notch fa-spin text-sm"></i>
                                          <span v-else>{{ formatNumber(row.cant_pedida, 0) }}</span><span class="ml-1 text-[10px]">pz</span>
                                       </p>
                                    </div>
                                    <div v-if="canShowCpfrStepper" class="flex h-11 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                                       <button
                                          type="button"
                                          class="flex h-11 w-11 items-center justify-center text-slate-600 transition active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
                                          :title="isMixPairRow(row) ? 'Renglon generado por mix' : 'Disminuir pedido'"
                                          :disabled="isMixPairRow(row) || isRowAdjusting(row) || !row.sku_muliix || !canDecreaseCpfrRow(row)"
                                          @click="handleAdjustPedido(row, -1)"
                                       ><i class="fa-solid fa-minus text-xs"></i></button>
                                       <button
                                          type="button"
                                          class="flex h-11 w-11 items-center justify-center border-l border-slate-200 text-slate-600 transition active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
                                          :title="isMixPairRow(row) ? 'Renglon generado por mix' : 'Regresar hacia pedido base'"
                                          :disabled="isMixPairRow(row) || isRowAdjusting(row) || !row.sku_muliix || !canIncreaseCpfrRow(row)"
                                          @click="handleAdjustPedido(row, 1)"
                                       ><i class="fa-solid fa-plus text-xs"></i></button>
                                    </div>
                                    <span v-else class="text-[10px] font-black uppercase text-emerald-700">{{ isMixPairRow(row) ? 'Generado por mix' : 'Sin edición' }}</span>
                                 </div>
                              </article>
                           </div>

                           <div class="hidden xl:block">
                              <table class="w-full table-fixed border-collapse text-[10px]">
                                 <thead>
                                    <tr class="border-b border-slate-200 bg-white text-[9px] font-black uppercase tracking-wide text-slate-600">
                                       <th class="w-[32%] px-3 py-2 text-left">SKU</th>
                                       <th class="w-[10%] px-3 py-2 text-right">Inv. Act.</th>
                                       <th class="w-[10%] px-3 py-2 text-right">Sell Prom.</th>
                                       <th class="w-[10%] px-3 py-2 text-right">Cob. S.</th>
                                       <th class="w-[9%] px-3 py-2 text-right">Base</th>
                                       <th class="w-[9%] px-3 py-2 text-right">Ajuste</th>
                                       <th class="w-[8%] px-3 py-2 text-right">Mix</th>
                                       <th class="w-[12%] px-3 py-2 text-right">Pedido</th>
                                    </tr>
                                 </thead>
                                 <tbody class="divide-y divide-dashed divide-slate-200">
                                    <tr
                                       v-for="(row, idx) in order.rows"
                                       :key="`${order.key}|${row.sku_muliix || row.sku_cadena || row.upc}|${idx}`"
                                       :class="idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'"
                                    >
                                       <td class="px-3 py-2">
                                          <p class="truncate font-black uppercase text-slate-700" :title="row.desc">{{ row.desc }}</p>
                                          <p class="mt-0.5 truncate font-mono text-[8px] font-bold text-slate-400">
                                             {{ row.sku_muliix || row.sku_cadena || row.upc || '-' }}
                                          </p>
                                       </td>
                                       <td class="px-3 py-2 text-right font-black text-brand-700">{{ formatNumber(row.inv_actual_pz, 2) }}</td>
                                       <td class="px-3 py-2 text-right font-black text-brand-700">{{ formatNumber(row.promedio_sellout_pz, 2) }}</td>
                                       <td
                                          class="px-3 py-2 text-right font-black"
                                          :class="coberturaClass(row)"
                                          :title="coberturaTooltip(row)"
                                       >
                                          <span class="flex items-center justify-end gap-1.5">
                                             <i v-if="coberturaIcon(row)" :class="coberturaIcon(row)" class="text-[10px]"></i>
                                             {{ formatNumber(calcularCoberturaDinamica(row), 2) }}
                                          </span>
                                       </td>
                                       <td class="px-3 py-2 text-right font-black text-slate-700">{{ formatNumber(row.cantidad_base_uni, 0) }}</td>
                                       <td
                                          class="px-3 py-2 text-right font-black"
                                          :class="row.ajusteValido ? (row.ajuste === 0 ? 'text-slate-400' : 'text-amber-700') : 'text-red-700'"
                                          :title="row.ajusteValido ? 'Ajuste sobre cantidad base' : 'El ajuste no respeta el multiplo pzas_bolsa'"
                                       >
                                          {{ row.ajuste > 0 ? '+' : '' }}{{ formatNumber(row.ajuste, 0) }}
                                       </td>
                                       <td
                                          class="px-3 py-2 text-right font-black"
                                          :class="row.ajuste_mix === 0 ? 'text-slate-400' : 'text-emerald-700'"
                                          title="Ajuste por balanceo mix"
                                       >
                                          {{ row.ajuste_mix > 0 ? '+' : '' }}{{ formatNumber(row.ajuste_mix, 0) }}
                                       </td>
                                       <td class="px-3 py-2">
                                          <div
                                             v-if="canShowCpfrStepper"
                                             class="ml-auto flex items-center justify-end gap-1.5"
                                          >
                                             <div class="flex w-[116px] items-center justify-end overflow-hidden rounded-lg border border-slate-200 bg-white">
                                                <button
                                                   type="button"
                                                   class="flex h-8 w-8 shrink-0 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                                                   :title="isMixPairRow(row) ? 'Renglon generado por mix' : 'Disminuir pedido'"
                                                   :disabled="isMixPairRow(row) || isRowAdjusting(row) || !row.sku_muliix || !canDecreaseCpfrRow(row)"
                                                   @click="handleAdjustPedido(row, -1)"
                                                >
                                                   <i class="fa-solid fa-minus text-[10px]"></i>
                                                </button>
                                                <span
                                                   class="flex h-8 min-w-0 flex-1 items-center justify-center border-x border-slate-200 px-2 text-center font-black"
                                                   :class="isMixPairRow(row) ? 'bg-slate-50 text-slate-500' : 'text-brand-700'"
                                                   :title="isMixPairRow(row) ? 'Renglon generado por mix; ajusta el SKU base' : 'Pedido final'"
                                                >
                                                   <i v-if="isRowAdjusting(row)" class="fa-solid fa-circle-notch fa-spin text-[10px]"></i>
                                                   <span v-else>{{ formatNumber(row.cant_pedida, 0) }}</span>
                                                </span>
                                                <button
                                                   type="button"
                                                   class="flex h-8 w-8 shrink-0 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                                                   :title="isMixPairRow(row) ? 'Renglon generado por mix' : 'Regresar hacia pedido base'"
                                                   :disabled="isMixPairRow(row) || isRowAdjusting(row) || !row.sku_muliix || !canIncreaseCpfrRow(row)"
                                                   @click="handleAdjustPedido(row, 1)"
                                                >
                                                   <i class="fa-solid fa-plus text-[10px]"></i>
                                                </button>
                                             </div>
                                             <button
                                                v-if="rowHasMixMetadata(row)"
                                                type="button"
                                                class="flex h-8 w-7 shrink-0 items-center justify-center rounded-md border text-[10px] font-black shadow-sm transition"
                                                :class="getRowMixButtonClass(row)"
                                                :title="getRowMixButtonTitle(row)"
                                                @click="openRowMix(row)"
                                             >
                                                <i v-if="getRowMixStatus(row) === 'pending'" class="fa-solid fa-triangle-exclamation text-[10px]"></i>
                                                <span v-else>M</span>
                                             </button>
                                             <span v-else class="h-8 w-7 shrink-0" aria-hidden="true"></span>
                                          </div>
                                          <p v-else class="text-right font-black" :class="isMixPairRow(row) ? 'text-emerald-700' : 'text-brand-700'">
                                             {{ formatNumber(row.cant_pedida, 0) }} pz
                                             <span v-if="isMixPairRow(row)" class="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[8px] font-black uppercase text-emerald-700">mix</span>
                                          </p>
                                       </td>
                                    </tr>
                                 </tbody>
                              </table>
                           </div>
                        </section>
                     </div>
                  </article>
               </div>
            </section>

            <section v-if="false" class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
               <label class="block text-xs font-medium text-slate-600 mb-1">Comentarios <span class="text-slate-400">(opcional)</span></label>
               <textarea 
                  v-model="resolutionComment"
                  rows="2"
                  class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none text-sm"
                  placeholder="Agrega comentarios para esta aprobacion..."
               ></textarea>
            </div>

            <div class="flex justify-end">
               <button
                  @click="handleConfirm"
                  :disabled="isSubmitting"
                  class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-70 sm:w-auto"
               >
                  <i :class="isSubmitting ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'" class="text-xs"></i>
                  Confirmar
               </button>
            </div>
         </div>

      </div>

      <div
         v-if="selectedMixRowKey"
         class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-3 py-6"
         @click.self="closeRowMix"
      >
         <section class="w-full max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
               <div class="min-w-0">
                  <h4 class="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-emerald-800">
                     <i class="fa-solid fa-scale-balanced text-emerald-600"></i>
                     Mix de producto
                  </h4>
                  <p class="mt-1 text-[11px] font-semibold text-slate-500">
                     Pedido final = sugerido + ajuste + mix. Por guardar: {{ pendingCpfrMixCount }}
                  </p>
               </div>
               <button
                  type="button"
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  title="Cerrar mix"
                  @click="closeRowMix"
               >
                  <i class="fa-solid fa-xmark text-xs"></i>
               </button>
            </header>

            <div class="space-y-3 px-4 py-4">
               <div v-if="cpfrMixError" class="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
                  {{ cpfrMixError }}
               </div>
               <div v-else-if="isLoadingMixPreview && !selectedMixGroup" class="flex items-center gap-2 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
                  <i class="fa-solid fa-circle-notch fa-spin"></i>
                  Cargando mix...
               </div>
               <div v-else-if="!selectedMixGroup" class="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
                  Este SKU tiene Par configurado, pero el preview no encontró un grupo aplicable. Es posible que el Mix no esté habilitado para este producto o que el mixeo deba realizarse desde su par. Si crees que es un error contacta al administrador.
               </div>

               <article v-if="selectedMixGroup" class="rounded-lg border border-emerald-100 bg-white p-3">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                     <div class="min-w-0">
                        <p class="truncate text-sm font-black text-slate-800" :title="`${selectedMixGroup.base_name} / ${selectedMixGroup.pair_name}`">
                           {{ selectedMixGroup.base_name }} / {{ selectedMixGroup.pair_name }}
                        </p>
                        <p class="mt-1 font-mono text-[10px] font-bold text-slate-400">
                           {{ selectedMixGroup.source_type === 'ocz8' ? 'Z8' : 'OC' }} {{ selectedMixGroup.num_pedido }} | {{ selectedMixGroup.base_sku }} -> {{ selectedMixGroup.pair_sku }}
                        </p>
                     </div>
                     <div
                        class="flex w-fit shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[9px] font-black uppercase tracking-wide"
                        :class="selectedMixGroup.applied ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
                     >
                        <i class="fa-solid" :class="selectedMixGroup.applied ? 'fa-check' : 'fa-floppy-disk'"></i>
                        {{ selectedMixGroup.applied ? 'Guardado' : 'Sin guardar' }}
                     </div>
                  </div>
                  <div
                     v-if="!selectedMixGroup.applied"
                     class="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-800"
                  >
                     <i class="fa-solid fa-floppy-disk mt-0.5 text-amber-600"></i>
                     <span>El cálculo mostrado ya usa el ajuste actual. Solo falta guardar este mix para actualizar los renglones base y par.</span>
                  </div>
                  <div
                     v-else
                     class="mt-3 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-800"
                  >
                     <i class="fa-solid fa-check mt-0.5 text-emerald-600"></i>
                     <span>Mix guardado. Base y par ya coinciden con el ajuste actual.</span>
                  </div>
                  <div v-if="isLoadingMixPreview" class="mt-3 flex items-center gap-2 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1.5 text-[10px] font-bold text-emerald-700">
                     <i class="fa-solid fa-circle-notch fa-spin"></i>
                     Actualizando preview...
                  </div>

                  <div v-if="mixOverrides[getMixKey(selectedMixGroup)]" class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                     <label class="text-[9px] font-black uppercase tracking-wide text-slate-500">
                        Base
                        <input
                           :value="mixOverrides[getMixKey(selectedMixGroup)].mixbase"
                           type="number"
                           min="0"
                           max="1"
                           step="0.1"
                           class="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-right text-[11px] font-bold text-slate-700"
                           :disabled="!canEditCpfrOrder"
                           @input="handleMixRatioInput(selectedMixGroup, 'mixbase', $event)"
                        >
                     </label>
                     <label class="text-[9px] font-black uppercase tracking-wide text-slate-500">
                        Par
                        <input
                           :value="mixOverrides[getMixKey(selectedMixGroup)].mixpar"
                           type="number"
                           min="0"
                           max="1"
                           step="0.1"
                           class="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-right text-[11px] font-bold text-slate-700"
                           :disabled="!canEditCpfrOrder"
                           @input="handleMixRatioInput(selectedMixGroup, 'mixpar', $event)"
                        >
                     </label>
                     <div class="rounded-md bg-slate-50 px-2 py-1.5 text-right">
                        <p class="text-[8px] font-black uppercase text-slate-400">Base final</p>
                        <p class="text-[11px] font-black text-slate-700">{{ formatNumber(selectedMixGroup.base_final_pieces, 0) }} pz</p>
                        <p class="text-[9px] font-bold text-slate-400">{{ formatNumber(selectedMixGroup.base_final_kg, 2) }} kg</p>
                     </div>
                     <div class="rounded-md bg-slate-50 px-2 py-1.5 text-right">
                        <p class="text-[8px] font-black uppercase text-slate-400">Par final</p>
                        <p class="text-[11px] font-black text-slate-700">{{ formatNumber(selectedMixGroup.pair_final_pieces, 0) }} pz</p>
                        <p class="text-[9px] font-bold text-slate-400">{{ formatNumber(selectedMixGroup.pair_final_kg, 2) }} kg</p>
                     </div>
                  </div>

                  <div class="mt-3 grid gap-2 text-right text-[10px] font-bold sm:grid-cols-3">
                     <div class="rounded-md bg-slate-50 px-2 py-1.5 text-slate-600">
                        <p class="text-[8px] font-black uppercase tracking-wide text-slate-400">Pre</p>
                        <p>Piezas pre: {{ formatNumber(selectedMixGroup.pre_mix_quantity, 0) }}</p>
                        <p class="text-[9px] text-slate-400">Kg pre: {{ formatNumber(groupPreKg(selectedMixGroup), 2) }}</p>
                     </div>
                     <div class="rounded-md bg-emerald-50 px-2 py-1.5 text-emerald-700">
                        <p class="text-[8px] font-black uppercase tracking-wide text-emerald-500">Mix</p>
                        <p>Piezas mix: {{ formatNumber(groupMixPieces(selectedMixGroup), 0) }}</p>
                        <p class="text-[9px] text-emerald-600">Kg mix: {{ formatNumber(groupMixKg(selectedMixGroup), 2) }}</p>
                     </div>
                     <div class="rounded-md bg-amber-50 px-2 py-1.5 text-amber-700">
                        <p class="text-[8px] font-black uppercase tracking-wide text-amber-500">Dif</p>
                        <p>Dif pz: {{ groupMixDiffPieces(selectedMixGroup) >= 0 ? '+' : '' }}{{ formatNumber(groupMixDiffPieces(selectedMixGroup), 0) }}</p>
                        <p class="text-[9px] text-amber-600">Dif kg: {{ formatNumber(selectedMixGroup.total_diff_kg, 2) }}</p>
                     </div>
                  </div>
               </article>
            </div>

            <footer v-if="canEditCpfrOrder" class="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
               <div class="min-h-5 text-[10px] font-bold">
                  <span v-if="selectedMixGroup?.applied" class="inline-flex items-center gap-1.5 text-emerald-700">
                     <i class="fa-solid fa-check-circle"></i>
                     Mix guardado correctamente
                  </span>
                  <span v-else-if="selectedMixGroup" class="inline-flex items-center gap-1.5 text-amber-700">
                     <i class="fa-solid fa-floppy-disk"></i>
                     Cambios listos para guardar
                  </span>
               </div>
               <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                     type="button"
                     class="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
                     @click="closeRowMix"
                  >
                     Cerrar
                  </button>
               <button
                  v-if="selectedMixGroup && !selectedMixGroup.applied"
                  type="button"
                  class="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-[11px] font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="isLoadingMixPreview || isApplyingMix"
                  @click="applyCpfrMix"
               >
                  <i
                     class="fa-solid text-[10px]"
                     :class="isApplyingMix ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk'"
                  ></i>
                  {{ isApplyingMix ? 'Guardando...' : 'Guardar mix actualizado' }}
               </button>
               </div>
            </footer>
         </section>
      </div>
   </section>
</template>
