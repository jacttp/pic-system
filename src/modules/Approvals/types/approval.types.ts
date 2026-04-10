// src/modules/Approvals/types/approval.types.ts

export type ApprovalType =
   | 'PROMOTION'
   | 'USER_ROLE_CHANGE'
   | 'REPORT_ACCESS'
   | 'CPFR_ORDER'

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface Approval {
   id: number
   type: ApprovalType
   status: ApprovalStatus
   title: string
   description: string
   requestedBy: string
   requestedById: number
   requestedAt: string
   // Aprobador explícito asignado al crear la solicitud
   assignedToId?: number
   resolvedBy?: string
   resolvedById?: number
   resolvedAt?: string
   rejectionReason?: string
   payload: Record<string, unknown>
}

export interface ApprovalResolution {
   status: 'APPROVED' | 'REJECTED'
   rejectionReason?: string
}

export interface ApprovalCreatePayload {
   type: ApprovalType
   title: string
   description: string
   payload: Record<string, unknown>
   /** ID del usuario que recibirá la notificación y será el aprobador asignado */
   notifyUserId?: number
}

export interface ApprovalFilters {
   status?: ApprovalStatus
   type?: ApprovalType
   /** 'assignee' → trae solicitudes donde el usuario autenticado es el aprobador asignado */
   role?: 'assignee'
}

// Labels y colores para UI
export const APPROVAL_STATUS_CONFIG: Record<ApprovalStatus, { label: string; color: string; bg: string; icon: string }> = {
   PENDING: { label: 'Pendiente', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: 'fa-solid fa-clock' },
   APPROVED: { label: 'Aprobada', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: 'fa-solid fa-circle-check' },
   REJECTED: { label: 'Rechazada', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: 'fa-solid fa-circle-xmark' },
   CANCELLED: { label: 'Cancelada', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', icon: 'fa-solid fa-ban' },
}

export const APPROVAL_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
   PROMOTION: { label: 'Promoción', color: 'text-violet-600', icon: 'fa-solid fa-tags' },
   USER_ROLE_CHANGE: { label: 'Cambio de Rol', color: 'text-blue-600', icon: 'fa-solid fa-user-gear' },
   REPORT_ACCESS: { label: 'Acceso Reporte', color: 'text-teal-600', icon: 'fa-solid fa-file-shield' },
   CPFR_ORDER: { label: 'Pedido CPFR', color: 'text-indigo-600', icon: 'fa-solid fa-truck-fast' },
}