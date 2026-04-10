/**
 * src/modules/Approvals/stores/approvalsStore.ts
 *
 * Maneja dos colecciones separadas:
 *   - approvals        → solicitudes creadas por el usuario autenticado
 *   - assignedApprovals → solicitudes donde el usuario es el aprobador asignado
 *
 * PATRÓN DE USO EXTERNO (otros módulos):
 * ─────────────────────────────────────────────
 * import { useApprovalsStore } from '@/modules/Approvals/stores/approvalsStore'
 *
 * const approvalsStore = useApprovalsStore()
 * await approvalsStore.createApproval({
 *    type: 'CPFR_ORDER',
 *    title: 'Pedido semana 14 — Tienda 101',
 *    description: 'Requiere validación de inventario antes de envío.',
 *    payload: { id_cliente: '101', semana_ic: 14 },
 *    notifyUserId: 42   // ID del aprobador específico
 * })
 * ─────────────────────────────────────────────
 */
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { approvalsApi } from '../services/approvalsApi';
import type {
   Approval,
   ApprovalCreatePayload,
   ApprovalResolution,
   ApprovalFilters,
} from '../types/approval.types';

export const useApprovalsStore = defineStore('approvals', () => {

   // ── Estado ───────────────────────────────────────────────────
   /** Solicitudes enviadas por el usuario autenticado */
   const approvals = ref<Approval[]>([]);
   /** Solicitudes asignadas al usuario para que él las resuelva */
   const assignedApprovals = ref<Approval[]>([]);
   const selectedApproval = ref<Approval | null>(null);
   const isLoading = ref(false);
   const isLoadingAssigned = ref(false);
   const error = ref<string | null>(null);

   // ── Computed ─────────────────────────────────────────────────
   /** Pendientes enviadas por mí */
   const pendingCount = computed(() =>
      approvals.value.filter(a => a.status === 'PENDING').length
   );
   /** Pendientes que me tocca resolver */
   const assignedPendingCount = computed(() =>
      assignedApprovals.value.filter(a => a.status === 'PENDING').length
   );
   /** Total de badges a mostrar (mis enviadas + las que debo resolver) */
   const totalPendingCount = computed(() =>
      pendingCount.value + assignedPendingCount.value
   );

   const pendingApprovals = computed(() => approvals.value.filter(a => a.status === 'PENDING'));
   const resolvedApprovals = computed(() => approvals.value.filter(a => a.status !== 'PENDING'));

   // ── Acciones ─────────────────────────────────────────────────

   /** Carga las solicitudes creadas por el usuario autenticado */
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

   /** Carga las solicitudes asignadas al usuario para resolver */
   async function fetchAssignedApprovals(filters?: Omit<ApprovalFilters, 'role'>) {
      isLoadingAssigned.value = true;
      try {
         assignedApprovals.value = await approvalsApi.getApprovals({
            ...filters,
            role: 'assignee',
         });
      } catch (err: any) {
         console.error('[ApprovalsStore] fetchAssignedApprovals:', err.response?.data?.message);
      } finally {
         isLoadingAssigned.value = false;
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

   /**
    * Resuelve una solicitud asignada al usuario.
    * Actualiza ambas colecciones (assigned + approvals del solicitante si coincide).
    */
   async function resolveApproval(id: number, resolution: ApprovalResolution) {
      error.value = null;
      try {
         await approvalsApi.resolveApproval(id, resolution);

         const patch = {
            status: resolution.status,
            rejectionReason: resolution.rejectionReason,
            resolvedAt: new Date().toISOString(),
         };

         // Actualizar en assignedApprovals
         const assignedIdx = assignedApprovals.value.findIndex(a => a.id === id);
         if (assignedIdx !== -1) {
            assignedApprovals.value[assignedIdx] = {
               ...assignedApprovals.value[assignedIdx]!,
               ...patch,
            };
         }

         // Actualizar en approvals (si el solicitante también está logueado — caso SuperAdmin)
         const ownIdx = approvals.value.findIndex(a => a.id === id);
         if (ownIdx !== -1) {
            approvals.value[ownIdx] = { ...approvals.value[ownIdx]!, ...patch };
         }

         if (selectedApproval.value?.id === id) {
            selectedApproval.value = { ...selectedApproval.value, ...patch };
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
            approvals.value[idx] = { ...approvals.value[idx]!, status: 'CANCELLED' };
         }
      } catch (err: any) {
         error.value = err.response?.data?.message || 'Error al cancelar solicitud.';
         throw err;
      }
   }

   return {
      // Estado
      approvals,
      assignedApprovals,
      selectedApproval,
      isLoading,
      isLoadingAssigned,
      error,
      // Computed
      pendingCount,
      assignedPendingCount,
      totalPendingCount,
      pendingApprovals,
      resolvedApprovals,
      // Acciones
      fetchApprovals,
      fetchAssignedApprovals,
      fetchApprovalById,
      createApproval,
      resolveApproval,
      cancelApproval,
   };
});