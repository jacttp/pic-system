/**
 * src/modules/Approvals/utils/approvalIntegration.ts
 * 
 * PATRÓN DE INTEGRACIÓN — Ejemplo documentado de cómo cualquier módulo
 * puede crear solicitudes de aprobación sin modificar el módulo Approvals.
 * 
 * CASO: Módulo de Promociones (futuro) quiere someter una promoción
 * a aprobación antes de publicarla.
 * 
 * USO:
 * ────────────────────────────────────
 * import { submitPromotionForApproval } from '@/modules/Approvals/utils/approvalIntegration'
 * 
 * await submitPromotionForApproval({
 *    id: 42,
 *    name: 'Descuento Verano 2025',
 *    description: '20% en toda la línea PREMIUM',
 *    startDate: '2025-06-01',
 *    endDate: '2025-08-31',
 *    discount: 20,
 *    targetSegment: 'Q1-Q2'
 * })
 * ────────────────────────────────────
 * 
 * La solicitud aparecerá en la bandeja de Admin/SuperAdmin automáticamente.
 * Al aprobarla, el solicitante recibirá una notificación.
 * 
 * Para agregar NUEVOS tipos de solicitud:
 * 1. Agregar el tipo en approval.types.ts → ApprovalType union
 * 2. Agregar config en APPROVAL_TYPE_CONFIG para label/icon/color
 * 3. Crear función helper similar a submitPromotionForApproval
 * 
 * NO se necesita modificar ningún archivo del módulo Approvals.
 */

import { useApprovalsStore } from '../stores/approvalsStore';

// Ejemplo: integración del módulo de Promociones
interface PromotionData {
   id: number;
   name: string;
   description: string;
   startDate?: string;
   endDate?: string;
   discount?: number;
   targetSegment?: string;
}

export async function submitPromotionForApproval(promotion: PromotionData) {
   const approvalsStore = useApprovalsStore();

   return await approvalsStore.createApproval({
      type: 'PROMOTION',
      title: `Solicitud de promoción: ${promotion.name}`,
      description: promotion.description,
      payload: {
         promotionId: promotion.id,
         name: promotion.name,
         startDate: promotion.startDate,
         endDate: promotion.endDate,
         discount: promotion.discount,
         targetSegment: promotion.targetSegment,
      }
   });
}

// Ejemplo: cambio de rol (usado por módulo Users)
export async function submitRoleChangeForApproval(userId: number, username: string, currentRole: string, newRole: string) {
   const approvalsStore = useApprovalsStore();

   return await approvalsStore.createApproval({
      type: 'USER_ROLE_CHANGE',
      title: `Cambio de rol: ${username}`,
      description: `Solicitud de cambio de rol de ${currentRole} a ${newRole} para el usuario ${username}.`,
      payload: {
         userId,
         username,
         currentRole,
         newRole,
      }
   });
}
