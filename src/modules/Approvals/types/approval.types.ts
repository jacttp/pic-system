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

export interface CpfrApprovalRow extends Record<string, unknown> {
   id_cliente: string
   num_pedido: string
   sku_muliix: string
   source_type: string
   cant_pedida: number
   fec_fin_embarque?: string | null
   lead_time: number
   z8_eligible: boolean
   z8_permiso_oc?: 'z8' | 'z8carnes' | null
   is_expired: boolean
}

export interface CpfrExpiredOrderSummary {
   id_cliente: string
   num_pedido: string
   fec_fin_embarque: string | null
   lead_time: number
   total_skus: number
   eligible_skus: number
   total_pieces: number
}

export interface CpfrApprovalDetail extends Record<string, unknown> {
   rows: CpfrApprovalRow[]
   expired_orders: CpfrExpiredOrderSummary[]
}

export interface CpfrZ8ConversionLine {
   sku_muliix: string
   cantidad: number
}

export interface CpfrZ8Target {
   num_pedido: string
   permiso_oc: 'z8' | 'z8carnes'
   created: boolean
   fec_pedido_cadena: string
   fec_fin_embarque: string
   semana_ic: string
   anio: string
}

export interface CpfrZ8ConversionResult {
   source_order: string
   id_cliente: string
   nombre_tienda: string
   targets: CpfrZ8Target[]
   transferred_skus: number
   transferred_pieces: number
}

export interface CpfrZ8ConversionResponse {
   conversion: CpfrZ8ConversionResult
   detail: CpfrApprovalDetail
}

// Labels y colores para UI
export const APPROVAL_STATUS_CONFIG: Record<ApprovalStatus, { label: string; color: string; bg: string; icon: string }> = {
   PENDING: { label: 'Pendiente', color: 'text-pic-brand', bg: 'bg-pic-brand-soft border-pic-brand-border', icon: 'fa-solid fa-clock' },
   APPROVED: { label: 'Aprobada', color: 'text-pic-success', bg: 'bg-[hsl(var(--pic-success)/0.10)] border-[hsl(var(--pic-success)/0.28)]', icon: 'fa-solid fa-circle-check' },
   REJECTED: { label: 'Rechazada', color: 'text-pic-danger', bg: 'bg-[hsl(var(--pic-danger)/0.10)] border-[hsl(var(--pic-danger)/0.32)]', icon: 'fa-solid fa-circle-xmark' },
   CANCELLED: { label: 'Cancelada', color: 'text-pic-danger', bg: 'bg-[hsl(var(--pic-danger)/0.16)] border-[hsl(var(--pic-danger)/0.42)]', icon: 'fa-solid fa-ban' },
}

export const APPROVAL_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
   PROMOTION: { label: 'Promoción', color: 'text-violet-600', icon: 'fa-solid fa-tags' },
   USER_ROLE_CHANGE: { label: 'Cambio de Rol', color: 'text-blue-600', icon: 'fa-solid fa-user-gear' },
   REPORT_ACCESS: { label: 'Acceso Reporte', color: 'text-teal-600', icon: 'fa-solid fa-file-shield' },
   CPFR_ORDER: { label: 'Pedido CPFR', color: 'text-indigo-600', icon: 'fa-solid fa-truck-fast' },
}
