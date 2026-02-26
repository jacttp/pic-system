/**
 * src/modules/Approvals/stores/approvalsStore.ts
 * 
 * Store de aprobaciones — diseñado para consumo externo por otros módulos.
 * 
 * PATRÓN DE USO EXTERNO (para futuros módulos):
 * ─────────────────────────────────────────────
 * import { useApprovalsStore } from '@/modules/Approvals/stores/approvalsStore'
 * 
 * async function submitForApproval(data: SomeData) {
 *    const approvalsStore = useApprovalsStore()
 *    await approvalsStore.createApproval({
 *       type: 'PROMOTION',           // Usar un ApprovalType existente o agregar uno nuevo
 *       title: `Solicitud: ${data.name}`,
 *       description: data.description,
 *       payload: { id: data.id, ...data }
 *    })
 * }
 * ─────────────────────────────────────────────
 */
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { approvalsApi } from '../services/approvalsApi';
import type {
   Approval,
   ApprovalCreatePayload,
   ApprovalResolution,
   ApprovalFilters
} from '../types/approval.types';

export const useApprovalsStore = defineStore('approvals', () => {

   // --- ESTADO ---
   const approvals = ref<Approval[]>([]);
   const selectedApproval = ref<Approval | null>(null);
   const isLoading = ref(false);
   const error = ref<string | null>(null);

   // --- COMPUTED ---
   const pendingCount = computed(() => approvals.value.filter(a => a.status === 'PENDING').length);
   const pendingApprovals = computed(() => approvals.value.filter(a => a.status === 'PENDING'));
   const resolvedApprovals = computed(() => approvals.value.filter(a => a.status !== 'PENDING'));

   // --- ACCIONES ---

   async function fetchApprovals(filters?: ApprovalFilters) {
      isLoading.value = true;
      error.value = null;
      try {
         approvals.value = await approvalsApi.getApprovals(filters);
      } catch (err: any) {
         error.value = err.response?.data?.message || 'Error al cargar solicitudes.';
         console.error('[ApprovalsStore]', error.value);
      } finally {
         isLoading.value = false;
      }
   }

   async function fetchApprovalById(id: number) {
      isLoading.value = true;
      error.value = null;
      try {
         selectedApproval.value = await approvalsApi.getApprovalById(id);
      } catch (err: any) {
         error.value = err.response?.data?.message || 'Error al cargar solicitud.';
      } finally {
         isLoading.value = false;
      }
   }

   async function createApproval(payload: ApprovalCreatePayload) {
      error.value = null;
      try {
         const created = await approvalsApi.createApproval(payload);
         approvals.value.unshift(created);
         return created;
      } catch (err: any) {
         error.value = err.response?.data?.message || 'Error al crear solicitud.';
         throw err;
      }
   }

   async function resolveApproval(id: number, resolution: ApprovalResolution) {
      error.value = null;
      try {
         await approvalsApi.resolveApproval(id, resolution);
         // Actualizar en local
         const idx = approvals.value.findIndex(a => a.id === id);
         if (idx !== -1) {
            const existing = approvals.value[idx]!;
            approvals.value[idx] = {
               ...existing,
               status: resolution.status,
               rejectionReason: resolution.rejectionReason,
               resolvedAt: new Date().toISOString(),
            };
         }
         if (selectedApproval.value?.id === id) {
            selectedApproval.value = null;
         }
      } catch (err: any) {
         error.value = err.response?.data?.message || 'Error al resolver solicitud.';
         throw err;
      }
   }

   async function cancelApproval(id: number) {
      error.value = null;
      try {
         await approvalsApi.cancelApproval(id);
         const idx = approvals.value.findIndex(a => a.id === id);
         if (idx !== -1) {
            const existing = approvals.value[idx]!;
            approvals.value[idx] = { ...existing, status: 'CANCELLED' };
         }
      } catch (err: any) {
         error.value = err.response?.data?.message || 'Error al cancelar solicitud.';
         throw err;
      }
   }

   return {
      // Estado
      approvals,
      selectedApproval,
      isLoading,
      error,
      // Computed
      pendingCount,
      pendingApprovals,
      resolvedApprovals,
      // Acciones
      fetchApprovals,
      fetchApprovalById,
      createApproval,
      resolveApproval,
      cancelApproval,
   };
});
