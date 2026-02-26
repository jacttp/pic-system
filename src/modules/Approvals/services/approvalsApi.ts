// src/modules/Approvals/services/approvalsApi.ts
import api from '@/api/axios';
import type {
   Approval,
   ApprovalCreatePayload,
   ApprovalResolution,
   ApprovalFilters
} from '../types/approval.types';

// Mapeo de respuesta backend → frontend
const mapApproval = (row: any): Approval => ({
   id: row.ApprovalId,
   type: row.Type,
   status: row.Status,
   title: row.Title,
   description: row.Description,
   requestedBy: row.RequestedBy,
   requestedById: row.RequestedById,
   requestedAt: row.RequestedAt,
   resolvedBy: row.ResolvedBy || undefined,
   resolvedById: row.ResolvedById || undefined,
   resolvedAt: row.ResolvedAt || undefined,
   rejectionReason: row.RejectionReason || undefined,
   payload: row.Payload ? JSON.parse(row.Payload) : {},
});

export const approvalsApi = {

   async getApprovals(filters?: ApprovalFilters): Promise<Approval[]> {
      const params: Record<string, string> = {};
      if (filters?.status) params.status = filters.status;
      if (filters?.type) params.type = filters.type;

      const { data } = await api.get('/v2/approvals', { params });
      return (data.data || []).map(mapApproval);
   },

   async getApprovalById(id: number): Promise<Approval> {
      const { data } = await api.get(`/v2/approvals/${id}`);
      return mapApproval(data.data);
   },

   async createApproval(payload: ApprovalCreatePayload): Promise<Approval> {
      const { data } = await api.post('/v2/approvals', payload);
      return mapApproval(data.data);
   },

   async resolveApproval(id: number, resolution: ApprovalResolution): Promise<boolean> {
      const { data } = await api.patch(`/v2/approvals/${id}/resolve`, resolution);
      return data.success;
   },

   async cancelApproval(id: number): Promise<boolean> {
      const { data } = await api.delete(`/v2/approvals/${id}`);
      return data.success;
   }
};
