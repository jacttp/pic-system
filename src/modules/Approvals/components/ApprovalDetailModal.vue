<!-- src/modules/Approvals/components/ApprovalDetailModal.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Approval } from '../types/approval.types';
import { APPROVAL_TYPE_CONFIG } from '../types/approval.types';
import { useApprovalsStore } from '../stores/approvalsStore';
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

// Reset al abrir
watch(() => props.modelValue, (open) => {
   if (open) {
      rejectionReason.value = '';
      errorMessage.value = '';
   }
});

const typeConfig = computed(() => {
   if (!props.approval) return { label: '', color: '', icon: '' };
   return APPROVAL_TYPE_CONFIG[props.approval.type] || { label: props.approval.type, color: 'text-slate-500', icon: 'fa-solid fa-file' };
});

const payloadEntries = computed(() => {
   if (!props.approval?.payload) return [];
   return Object.entries(props.approval.payload).filter(([_, v]) => v !== null && v !== undefined);
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
      size="lg"
      @close="closeModal"
   >
      <div v-if="approval" class="space-y-5">

         <!-- Header visual -->
         <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
               <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50" :class="typeConfig.color">
                  <i :class="typeConfig.icon" class="text-lg"></i>
               </div>
               <div>
                  <p class="text-xs font-medium" :class="typeConfig.color">{{ typeConfig.label }}</p>
                  <h3 class="text-lg font-bold text-slate-800">{{ approval.title }}</h3>
               </div>
            </div>
            <ApprovalStatusBadge :status="approval.status" />
         </div>

         <!-- Descripción -->
         <div class="bg-slate-50 rounded-lg p-4">
            <p class="text-sm text-slate-700 leading-relaxed">{{ approval.description }}</p>
         </div>

         <!-- Meta info -->
         <div class="grid grid-cols-2 gap-4 text-sm">
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

         <!-- Payload (datos adicionales) -->
         <div v-if="payloadEntries.length > 0" class="bg-slate-50 rounded-lg p-4">
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
